# MockEcho — AI Technical Interview Preparation Platform

MockEcho is an AI-powered mock interview preparation platform designed to help candidates practice technical interviews with real-time evaluation, voice or text responses, interactive multiple-choice and subjective questions, and actionable feedback reports.

---

## Key Features

- **Custom Practice Sessions**: Configure interviews by job role, topic/subject, difficulty, and question count.
- **Dynamic Question Generation**: Powered by Google Gemini AI, tailored to your domain and target experience level.
- **Multiple Response Formats**: Supports voice speech-to-text recording, manual transcript editing, and interactive multiple-choice options (single & multi-select).
- **Comprehensive Evaluation Reports**:
  - Overall performance score and skill dimension radar charts (Technical Accuracy, Communication, Clarity, Completeness, Confidence).
  - Key strengths and actionable improvement suggestions.
  - Question-by-question breakdown with ideal vs. actual diff analysis.
- **Practice Logs & Progress Tracking**: Review past interview logs, track practice streaks, and analyze historical progress over time.
- **Flexible Data Persistence**: Full offline local demo mode with seamless database sync when configured.

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Recharts, Motion, Lucide React
- **Backend / Server**: Express.js (Node.js CommonJS bundle via esbuild)
- **AI Integration**: `@google/genai` (Google Gemini API)
- **Database & Auth**: Supabase / Local Storage fallback
- **Build Tooling**: Vite, `tsx`, TypeScript

---

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd <repository-directory>
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Copy `.env.example` to `.env` (or configure in environment):
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   VITE_SUPABASE_URL=your_supabase_url_here
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:3000`.

---

## Available Scripts

- `npm run dev`: Launches the Express backend with Vite development middleware.
- `npm run build`: Builds the client assets with Vite and bundles the server code with `esbuild` into `dist/server.cjs`.
- `npm start`: Runs the production server from `dist/server.cjs`.
- `npm run lint`: Runs TypeScript type checking (`tsc --noEmit`).
- `npm run clean`: Cleans build output directories.

---

## License

MIT License.
