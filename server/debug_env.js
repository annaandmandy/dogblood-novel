import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try loading from default
dotenv.config();
console.log("--- Default Load ---");
console.log("CWD:", process.cwd());
console.log("GEMINI:", process.env.GEMINI_API_KEY ? "Loaded" : "Missing");
console.log("OPENROUTER:", process.env.OPENROUTER_API_KEY ? "Loaded" : "Missing");

// Try loading explicitly from current dir
dotenv.config({ path: path.join(__dirname, '.env') });
console.log("--- Explicit Load (.env in script dir) ---");
console.log("Path:", path.join(__dirname, '.env'));
console.log("GEMINI:", process.env.GEMINI_API_KEY ? "Loaded" : "Missing");
console.log("OPENROUTER:", process.env.OPENROUTER_API_KEY ? "Loaded" : "Missing");
