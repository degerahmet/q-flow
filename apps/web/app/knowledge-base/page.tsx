"use client"


import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Lock, Upload, FileText, Trash2, Calendar } from "lucide-react"

// Mock data for security documents
const documents = [
  {
    id: "1",
    name: "SOC2_Type_II_Report_2024.pdf",
    status: "Indexed",
    size: "2.4 MB",
    uploadDate: "2024-01-15",
  },
  {
    id: "2",
    name: "InfoSec_Policy_v4.pdf",
    status: "Indexed",
    size: "850 KB",
    uploadDate: "2024-02-20",
  },
]

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export default function KnowledgeBasePage() {
  return (
      <>
        {/* Demo Mode Alert Banner */}
        <Alert className="border-blue-200 bg-blue-50/50">
          <Lock className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-900">Demo Mode</AlertTitle>
          <AlertDescription className="text-blue-800">
            File upload is disabled. This is a read-only demonstration.
          </AlertDescription>
        </Alert>
        {/* Upload Area - Disabled */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-slate-900">Upload Documents</CardTitle>
            <CardDescription className="text-slate-600">
              Add security documents to your knowledge base
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "group relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50/50 p-12 text-center transition-colors",
                "opacity-50 cursor-not-allowed"
              )}
            >
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-full bg-slate-200 p-4">
                  <Upload className="h-8 w-8 text-slate-400" />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-500">
                    Drop files here or click to upload
                  </p>
                  <p className="text-xs text-slate-400">
                    PDF, DOC, DOCX up to 10MB
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="pointer-events-none border-slate-300 bg-slate-100 text-slate-400"
                  disabled
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Select Files
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Documents Table */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-slate-900">Security Documents</CardTitle>
            <CardDescription className="text-slate-600">
              Manage your uploaded security documentation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-md border border-slate-200">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50">
                    <TableHead className="text-slate-700">Name</TableHead>
                    <TableHead className="text-slate-700">Status</TableHead>
                    <TableHead className="text-slate-700">Size</TableHead>
                    <TableHead className="text-slate-700">Upload Date</TableHead>
                    <TableHead className="w-[100px] text-right text-slate-700">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-slate-500" />
                          <span>{doc.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="bg-blue-100 text-blue-700 hover:bg-blue-100"
                        >
                          {doc.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-600">{doc.size}</TableCell>
                      <TableCell className="text-slate-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          {formatDate(doc.uploadDate)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:bg-slate-100 hover:text-slate-400"
                          disabled
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </>
  )
}

