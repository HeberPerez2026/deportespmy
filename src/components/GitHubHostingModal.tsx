import React, { useState } from 'react';
import { Github, Globe, X, Check, Copy, ShieldCheck, Terminal, Server, ArrowRight } from 'lucide-react';

interface GitHubHostingModalProps {
  onClose: () => void;
}

export const GitHubHostingModal: React.FC<GitHubHostingModalProps> = ({ onClose }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyText = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const cnameContent = 'deportespmy.com.ar';

  const ghActionWorkflow = `name: Deploy DeportesPMY to GitHub Pages

on:
  push:
    branches:
      - main
      - master
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: 'pages'
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm install

      - name: Build application
        run: npm run build

      - name: Upload artifact for GitHub Pages
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 text-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 border border-slate-800 shadow-2xl space-y-6 my-8">
        
        {/* Header */}
        <div className="flex justify-between items-start pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center">
              <Github className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Guía de Despliegue en Servidor
              </span>
              <h3 className="text-xl font-bold font-heading text-white">
                Hosting en GitHub Pages & Dominio deportespmy.com.ar
              </h3>
            </div>
          </div>

          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Overview banner */}
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-slate-300 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-bold">
            <Globe className="w-4 h-4" />
            <span>Dominio Configurado: deportespmy.com.ar</span>
          </div>
          <p>
            Tu aplicación DeportesPMY es una Single Page Application (SPA) optimizada con Vite, Tailwind CSS y persistencia reactiva. Está lista para compilarse y publicarse gratuitamente en <strong className="text-white">GitHub Pages</strong> con certificado SSL automático HTTPS.
          </p>
        </div>

        {/* 3 Steps to Launch */}
        <div className="space-y-4 text-xs">
          
          {/* Step 1: CNAME */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-[11px]">1</span>
                Archivo CNAME en la raíz del repositorio
              </span>
              <button
                onClick={() => copyText('cname', cnameContent)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-200 flex items-center gap-1 cursor-pointer"
              >
                {copiedKey === 'cname' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>Copiar</span>
              </button>
            </div>
            <p className="text-slate-400">
              Creá un archivo llamado <code className="text-emerald-400 bg-slate-900 px-1 py-0.5 rounded">public/CNAME</code> o colocalo en la raíz de tu rama `gh-pages` con el contenido:
            </p>
            <div className="p-2.5 bg-slate-900 rounded-xl font-mono text-emerald-400">
              {cnameContent}
            </div>
          </div>

          {/* Step 2: DNS Records at NIC.ar */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 font-bold text-white">
              <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-[11px]">2</span>
              <span>Delegación DNS en NIC Argentina (.com.ar) o Cloudflare</span>
            </div>
            <p className="text-slate-400">
              Configurá los siguientes registros DNS de tipo A apuntando a los servidores globales de GitHub Pages:
            </p>
            <div className="p-2.5 bg-slate-900 rounded-xl font-mono text-[11px] text-slate-300 space-y-1">
              <div>A @ 185.199.108.153</div>
              <div>A @ 185.199.109.153</div>
              <div>A @ 185.199.110.153</div>
              <div>A @ 185.199.111.153</div>
              <div>CNAME www deportespmy.com.ar</div>
            </div>
          </div>

          {/* Step 3: GitHub Actions Workflow */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-[11px]">3</span>
                GitHub Actions para despliegue automático
              </span>
              <button
                onClick={() => copyText('workflow', ghActionWorkflow)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-200 flex items-center gap-1 cursor-pointer"
              >
                {copiedKey === 'workflow' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>Copiar Workflow</span>
              </button>
            </div>
            <p className="text-slate-400">
              Guardalo en <code className="text-emerald-400 bg-slate-900 px-1 py-0.5 rounded">.github/workflows/deploy.yml</code>:
            </p>
            <div className="p-3 bg-slate-900 rounded-xl font-mono text-[10px] text-slate-300 max-h-36 overflow-y-auto">
              <pre>{ghActionWorkflow}</pre>
            </div>
          </div>

        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer shadow-lg shadow-emerald-500/20"
          >
            Entendido, cerrar guía
          </button>
        </div>

      </div>
    </div>
  );
};
