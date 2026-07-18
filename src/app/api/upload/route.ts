// Upload de arquivos para o disco do servidor (volume /app/uploads em produção)
// Aceita multipart/form-data com o campo "file". Máximo 25 MB.
// Tipos permitidos: documentos, imagens e planilhas usados pelo ERP (allowlist).
import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { exigirPapel, erroInterno } from "@/lib/authz";

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
const MAX_MB = 25;

// Extensões aceitas — qualquer outra é recusada (evita HTML/SVG/exe servidos depois)
const EXTENSOES_PERMITIDAS = new Set([
  ".pdf", ".png", ".jpg", ".jpeg", ".webp", ".gif",
  ".xml", ".xlsx", ".xls", ".docx", ".doc", ".csv", ".txt",
  ".mp3", ".ogg", ".m4a", ".wav", // áudios do diário de obras/voz
]);

const sanitizar = (nome: string) =>
  nome.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);

export async function POST(req: NextRequest) {
  const { erro } = await exigirPapel(); // qualquer papel autenticado pode subir arquivos
  if (erro) return erro;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "Nenhum arquivo enviado (campo 'file')" }, { status: 400 });
    if (file.size > MAX_MB * 1024 * 1024) {
      return NextResponse.json({ error: `Arquivo acima de ${MAX_MB} MB` }, { status: 413 });
    }

    const nomeOriginal = sanitizar(file.name || "arquivo");
    const ext = path.extname(nomeOriginal).toLowerCase();
    if (!EXTENSOES_PERMITIDAS.has(ext)) {
      return NextResponse.json(
        { error: `Tipo de arquivo não permitido (${ext || "sem extensão"}). Aceitos: PDF, imagens, XML, planilhas, DOC, CSV, TXT e áudio.` },
        { status: 415 },
      );
    }

    const pasta = new Date().toISOString().slice(0, 7); // "2026-07"
    const nomeFinal = `${crypto.randomBytes(6).toString("hex")}-${nomeOriginal}`;
    const dir = path.join(UPLOAD_DIR, pasta);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, nomeFinal), Buffer.from(await file.arrayBuffer()));

    return NextResponse.json({
      success: true,
      url: `/api/arquivos/${pasta}/${nomeFinal}`,
      nome: file.name,
      mimeType: file.type || "application/octet-stream",
      tamanhoKb: Math.round(file.size / 1024),
    });
  } catch (e) {
    return erroInterno(e, "api/upload");
  }
}
