# Project Requirements Document (PRD)

**Project Name:** Q-Flow (AI-Powered Security Questionnaire Automation)
**Date:** December 10, 2025
**Status:** Draft / Planning
**Owner:** Ahmet Deger

## 1. Executive Summary

**Q-Flow** is a B2B SaaS platform designed to eliminate the bottleneck of manually filling out Security and Compliance Questionnaires (RFPs, vendor assessments). By leveraging a Retrieval-Augmented Generation (RAG) architecture orchestrated by **LangChain**, the system analyzes a company’s technical documentation (Knowledge Base) to automatically generate answers for Excel-based questionnaires. It features a "Human-in-the-loop" workflow to ensure accuracy before exporting the completed document.

---

## 2. Scope

### In-Scope (MVP)

* **Knowledge Base Management:** Ingestion of PDF and TXT documents.
* **Dynamic Excel Processing:** Parsing of various `.xlsx` templates with dynamic column mapping capabilities.
* **AI Response Generation:** RAG pipeline using LangChain, Vector Search, and LLMs to generate draft answers.
* **Review Interface:** A dashboard for users to review, edit, approve, or reject AI-generated answers.
* **Export:** Re-generating the Excel file with the answers while preserving the original layout and formatting.

### Out-of-Scope (Future Iterations)

* OCR for scanned PDF questionnaires or images.
* Direct email integrations (Gmail/Outlook plugins).
* Multi-language support (English only for MVP).
* SSO (Single Sign-On) integration.

---

## 3. Functional Requirements (FR)

### FR-01: Document Ingestion Engine

* **FR-01.1:** The system shall allow Admins to upload support documents (e.g., Whitepapers, SOC2 Reports, Security Policies).
* **FR-01.2:** The backend must utilize **LangChain Document Loaders** to parse `.pdf`, `.docx`, and `.txt` files.
* **FR-01.3:** Text must be processed using **LangChain RecursiveCharacterTextSplitter** to ensure optimal chunk sizes (e.g., 1000 tokens) with appropriate overlap.
* **FR-01.4:** Processed embeddings must be stored in a Vector Database (PostgreSQL + pgvector).

### FR-02: Project & Questionnaire Management

* **FR-02.1:** Users shall upload an Excel file (`.xlsx`) to initiate a new project.
* **FR-02.2:** The system must provide a "Column Mapping" interface, allowing users to identify which column contains the **Question** and which is for the **Answer**.
* **FR-02.3:** File processing must be handled via a background queue (BullMQ) to prevent request timeouts on large files.

### FR-03: The AI Core (RAG Pipeline)

* **FR-03.1:** For every parsed question, the system must perform a semantic search against the Knowledge Base.
* **FR-03.2:** The system must invoke a **LangChain Chain** (combining the Prompt Template, Retrieved Context, and LLM) to generate an answer.
* **FR-03.3:** The AI must assign a **Confidence Score** (0-100%) to each generated answer based on semantic similarity distance.

### FR-04: Review Dashboard & Feedback Loop

* **FR-04.1:** The UI must visually flag answers with low confidence scores (e.g., <70%) for mandatory human review.
* **FR-04.2:** Users must be able to edit AI answers.
* **FR-04.3:** Verified/Edited answers should be optionally fed back into the Knowledge Base as "Golden Records" for future use.

---

## 4. Non-Functional Requirements (NFR)

*These requirements define the system quality attributes, showcasing backend engineering skills.*

* **NFR-01 (Performance & Latency):** The User Interface must remain responsive during file processing. Real-time status updates (e.g., "Processing row 45/100") must be delivered via WebSockets or Server-Sent Events (SSE).
* **NFR-02 (Scalability):** The architecture must decouple the Web API from the Worker nodes to allow independent scaling. Heavy AI tasks should not block HTTP threads.
* **NFR-03 (Data Integrity):** The exported Excel file must strictly maintain the original file's cell formatting, styles, and hidden metadata.
* **NFR-04 (Fault Tolerance):** The system must include retry mechanisms for 3rd party API failures (e.g., OpenAI rate limits) without terminating the entire job.

---

## 5. User Stories

| ID | Role | I want to... | So that... | Acceptance Criteria |
| :--- | :--- | :--- | :--- | :--- |
| **US-1** | Sales Engineer | Upload a new Excel questionnaire and map columns. | I can handle different formats from different clients without manual reformatting. | 1. File uploads successfully.<br>2. UI shows a preview of the first 5 rows.<br>3. User selects "Question" & "Answer" columns. |
| **US-2** | Admin | Upload the company's security policy PDF. | The AI has the correct context to answer compliance questions. | 1. PDF upload triggers a background job.<br>2. System uses LangChain to split and embed text.<br>3. Content is searchable via vector search. |
| **US-3** | Reviewer | Filter answers with low confidence scores. | I can focus my time on answers that are likely to be incorrect. | 1. Dashboard includes a "Needs Review" filter.<br>2. Low confidence items are color-coded (Yellow/Red). |
| **US-4** | Sales Engineer | Export the approved questionnaire. | I can email the completed file back to the client immediately. | 1. Downloaded file matches the original structure.<br>2. Only the target "Answer" column is modified. |

---

## 6. Proof of Concept (PoC) Scope

To validate the architecture before full-scale development:

1. **Constraint:** Support `.xlsx` format only.
2. **Assumption:** Columns are auto-detected (e.g., assume Column A is Question, B is Answer) to skip the mapping UI for MVP.
3. **Core Loop:**
    * Upload File -> Parse to JSON -> Job Queue -> LangChain Processing -> Update JSON -> Export to Excel.
4. **Auth:** No authentication required for the PoC phase.

---

## 7. Data Model Draft (For ER Diagram)

* **`Project`**: `id`, `status` (QUEUED, PROCESSING, COMPLETED), `original_file_path`, `created_at`.
* **`QuestionItem`**: `id`, `project_id`, `row_index`, `question_text`, `ai_answer`, `human_answer`, `confidence_score`, `status` (PENDING, REVIEWED).
* **`Document`**: `id`, `filename`, `content_hash`, `upload_date`.
* **`Embedding`**: `id`, `document_id`, `chunk_content`, `vector` (vector(1536)).

### 8\. Assumptions & Constraints

Since this repository is the "Core" open-source version of Q-Flow, the following assumptions and constraints apply to the current architecture and Proof of Concept (PoC):

### 8.1. Data & File Formats

* **English Only:** The system is currently optimized for English inputs (both Knowledge Base documents and Questionnaires). Multi-language support is planned but not currently implemented.
* **No OCR Capability:** The system assumes that all uploaded PDFs and documents contain **selectable text**. Scanned images or flattened PDFs will not be processed by the embedding engine in this version.
* **Excel Structure:** The MVP assumes that the uploaded `.xlsx` questionnaire has a tabular structure with a clear header row. Complex merged cells or multi-sheet logic may require manual adjustments.
* **File Size Limits:** To prevent memory overflows in the Worker node, individual file uploads are soft-capped (e.g., 10MB per document) in the configuration.

#### 8.2. Third-Party Dependencies

* **OpenAI API:** The project relies on OpenAI's `gpt-4o` (or similar) and `text-embedding-3-small` models. Users must provide their own valid `OPENAI_API_KEY`. The system does not currently support local LLMs (e.g., Ollama/Llama 3) out of the box.
* **Postgres with pgvector:** The application strictly requires a PostgreSQL instance with the `pgvector` extension enabled. Standard Postgres images will cause the migration scripts to fail.

#### 8.3. Operational & Logic

* **"Closed Context" Only:** The AI agent is designed to answer questions based **strictly** on the uploaded documents. It is instructed to minimize external knowledge usage to prevent hallucinations (i.e., if the answer isn't in the docs, it should state "Insufficient information").
* **Stateless Processing:** The worker processes each row independently. It does not currently maintain "conversational memory" between different rows of the same Excel sheet (e.g., Row 5 cannot reference information derived in Row 2).

#### 8.4. Security Disclaimer

* **Data Privacy:** This is a client-side/self-hosted core. If you use OpenAI, data is sent to their API. Users are responsible for ensuring that the data they upload complies with their company's data privacy policies regarding third-party AI processors.
* **Verification Required:** AI-generated answers are drafts. They **must** be reviewed by a human expert before being sent to third parties. This tool is an accelerator, not a replacement for a compliance officer.
