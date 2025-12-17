# Q-Flow 🛡️🤖

> **AI-Powered Automation Agent for B2B Security Questionnaires and RFPs**

![qflow](./docs/qflow.png)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Tech Stack](https://img.shields.io/badge/stack-Next.js_|_NestJS_|_LangChain_|_PostgreSQL-black)
![Status](https://img.shields.io/badge/status-In_Development-orange)

**Q-Flow** is an **AI Agent** platform designed to automate the painful, time-consuming process of manually filling out Excel/PDF-based security and compliance questionnaires (RFPs) for B2B companies.

It uses a **Retrieval-Augmented Generation (RAG)** architecture orchestrated by **LangChain** to search your company's technical documentation, generate accurate answers, and enforce a robust "Human-in-the-loop" mechanism before final export.

---

## 🏗 Architecture and System Design

The project is engineered for **scalability** and **performance** using an **Event-Driven Architecture**. Long-running AI processes are decoupled from the User Interface (UI) thread using message queues.

![SequenceDiagram](./docs/diagrams/sequence-diagram.png)

-----

## 🚀 Key Features

* **📁 Smart Document Ingestion:** Uses **LangChain Document Loaders** to ingest and chunk technical documentation (PDF, Markdown, TXT).
* **🧠 RAG Engine:** Vector-based search (Postgres + pgvector) learns from your knowledge base.
* **⚡ Asynchronous Queue System:** Uses **BullMQ** (powered by Redis) to manage jobs, preventing timeouts on large file uploads and processing.
* **✅ Confidence Scoring:** Automatically flags answers with low confidence (e.g., <70%) for mandatory human review.
* **🎨 Modern UI:** Responsive user interface built with **Next.js**, **Tailwind CSS**, and **shadcn/ui**.
* **🔄 Format Preservation:** Parses and re-generates Excel files while strictly maintaining the original cell styles and formatting.

-----

## 🛠 Tech Stack

The project utilizes a **Monorepo** structure managed by **Turborepo**.

### Apps

* **`apps/web`**: Frontend application.
  * Framework: **Next.js 16.0.7+ (App Router)**
  * Styling: **Tailwind CSS**
  * State Management: Zustand
* **`apps/api`**: Backend API and Worker service.
  * Framework: **NestJS**
  * Queue: **BullMQ** (Redis-based)
  * Documentation: Swagger / OpenAPI

### Packages & Infrastructure

* **Database**: PostgreSQL (with the `pgvector` extension)
* **ORM**: Prisma
* **AI Orchestration**: **LangChain** (Node.js)
  * Used for: Document Loading, Text Splitting (RecursiveCharacterTextSplitter), and Chain Management.
* **LLM**: OpenAI API (GPT-4o)
* **DevOps**: Docker & Docker Compose

-----

## 🏁 Getting Started

Follow these steps to get the project running on your local machine.

### Prerequisites

* Node.js 18+
* Docker & Docker Compose
* pnpm (`npm install -g pnpm`)

### 1\. Clone the Repository

```bash
git clone https://github.com/degerahmet/q-flow-pub-core.git
cd q-flow-pub-core
````

### 2\. Configure Environment Variables

Copy the `.env.example` file in the root directory to `.env` and fill in the necessary API keys.

```bash
cp .env.example .env
# Fill in OPENAI_API_KEY and DATABASE_URL
```

### 3\. Start Infrastructure (Docker)

Launch the PostgreSQL and Redis services.

```bash
docker-compose up -d
```

### 4\. Install Dependencies and Launch

```bash
pnpm install
pnpm db:push  # Sync database schema (Prisma migrate)
pnpm dev      # Start all applications (Web + API) concurrently
```

You can now access the services at:

* **Frontend:** `http://localhost:3000`
* **API / Swagger:** `http://localhost:3001/api`

-----

## ⚠️ Assumptions & Constraints

Since this repository is the "Core" open-source version of Q-Flow, please note the following limitations regarding the current architecture and Proof of Concept (PoC):

### Data & File Formats

* **English Only:** The system is currently optimized for English inputs. Multi-language support is planned.
* **No OCR Capability:** The system assumes all uploaded PDFs contain **selectable text**. Scanned images or flattened PDFs will not be processed by the embedding engine in this version.
* **Excel Structure:** The MVP assumes that the uploaded `.xlsx` questionnaire has a standard tabular structure with a clear header row.

### Operational Logic

* **Third-Party APIs:** The project relies on OpenAI models. Users must provide their own valid `OPENAI_API_KEY`. Local LLMs are not currently supported.
* **"Closed Context" Only:** The AI agent is designed to answer questions based **strictly** on the uploaded documents to minimize hallucinations.
* **Stateless Processing:** The worker processes each row independently and does not maintain "conversational memory" between different rows of the same Excel sheet.

-----

## 📸 Screenshots

*(Screenshots of the Dashboard and the Excel Upload interface will be added as the project progresses)*

-----

## 🔮 Roadmap

* [ ] OCR support for scanned PDF forms using LangChain Unstructured Loaders.
* [ ] Integration with Slack / Microsoft Teams for notifications.
* [ ] Auto-Learning: Automated feedback loop to re-ingest approved answers into the knowledge base.
* [ ] Multi-language support.

-----

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.