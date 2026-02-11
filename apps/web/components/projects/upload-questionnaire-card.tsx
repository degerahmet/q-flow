'use client';

import { useCallback, useState } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createProject } from '@/lib/api/projects';
import { getToken } from '@/lib/auth';
import { FileSpreadsheet, Loader2 } from 'lucide-react';

export interface ParsedQuestion {
  rowIndex: number;
  questionText: string;
}

function parseXlsxToQuestions(file: File): Promise<{ questions: ParsedQuestion[]; fileName: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data || !(data instanceof ArrayBuffer)) {
          reject(new Error('Failed to read file'));
          return;
        }
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          reject(new Error('No sheet found'));
          return;
        }
        const sheet = workbook.Sheets[firstSheetName];
        if (!sheet) {
          reject(new Error('No sheet found'));
          return;
        }
        const rows = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          defval: '',
        }) as string[][];

        if (!rows.length) {
          resolve({ questions: [], fileName: file.name });
          return;
        }

        const headerRow = (rows[0] ?? []).map((c) => String(c ?? '').trim());
        let questionColIndex = headerRow.findIndex((h) =>
          /question/i.test(h),
        );
        if (questionColIndex === -1) questionColIndex = 0;

        const questions: ParsedQuestion[] = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const raw = row?.[questionColIndex];
          const questionText = String(raw ?? '').trim();
          if (!questionText) continue;
          questions.push({
            rowIndex: i + 1,
            questionText,
          });
        }

        resolve({ questions, fileName: file.name });
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Parse failed'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

export interface UploadQuestionnaireCardProps {
  onCreated?: () => void;
}

export function UploadQuestionnaireCard({ onCreated }: UploadQuestionnaireCardProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [questions, setQuestions] = useState<ParsedQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const handleFile = useCallback(
    (file: File | null) => {
      setError(null);
      if (!file) {
        setFileName(null);
        setQuestions([]);
        return;
      }
      if (!file.name.toLowerCase().endsWith('.xlsx')) {
        setError('Please select an .xlsx file');
        setFileName(null);
        setQuestions([]);
        return;
      }
      setLoading(true);
      parseXlsxToQuestions(file)
        .then(({ questions: qs, fileName: name }) => {
          setFileName(name);
          setQuestions(qs);
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : 'Failed to parse file');
          setFileName(null);
          setQuestions([]);
        })
        .finally(() => setLoading(false));
    },
    [],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] ?? null;
      handleFile(file);
      e.target.value = '';
    },
    [handleFile],
  );

  const handleCreateProject = useCallback(async () => {
    const token = getToken();
    if (!token || questions.length === 0) return;
    setCreating(true);
    setError(null);
    try {
      await createProject(token, {
        originalName: fileName ?? undefined,
        sourceType: 'XLSX',
        questions: questions.map((q) => ({
          rowIndex: q.rowIndex,
          questionText: q.questionText,
        })),
      });
      setFileName(null);
      setQuestions([]);
      onCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setCreating(false);
    }
  }, [fileName, questions, onCreated]);

  const preview = questions.slice(0, 3);

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">New Project</h2>
        <p className="text-sm text-muted-foreground">
          Upload an Excel questionnaire (.xlsx) to create a project.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/30 px-6 py-8 text-center"
        >
          <input
            type="file"
            accept=".xlsx"
            onChange={handleInputChange}
            className="hidden"
            id="xlsx-upload"
          />
          <label
            htmlFor="xlsx-upload"
            className="cursor-pointer flex flex-col items-center gap-2"
          >
            <FileSpreadsheet className="h-10 w-10 text-muted-foreground" />
            <span className="text-sm font-medium">
              Drag & drop or click to select .xlsx
            </span>
          </label>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Parsing file...
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {fileName && questions.length > 0 && !loading && (
          <div className="space-y-2">
            <p className="text-sm">
              <span className="font-medium">{fileName}</span>
              {' — '}
              <span className="text-muted-foreground">
                {questions.length} question{questions.length !== 1 ? 's' : ''} detected
              </span>
            </p>
            {preview.length > 0 && (
              <ul className="list-inside list-disc text-sm text-muted-foreground space-y-0.5">
                {preview.map((q) => (
                  <li key={q.rowIndex} className="truncate max-w-full">
                    {q.questionText}
                  </li>
                ))}
                {questions.length > 3 && (
                  <li>… and {questions.length - 3} more</li>
                )}
              </ul>
            )}
            <Button
              onClick={handleCreateProject}
              disabled={creating}
            >
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Project'
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
