/**
 * Recebe os leads da página do Tour Gastronômico de Maués e grava na planilha.
 *
 * Como ativar (uma vez só):
 * 1. Abra a planilha "Leads · Tour Gastronômico de Maués" no Google Drive.
 * 2. Menu Extensões → Apps Script. Apague o que estiver lá e cole este arquivo inteiro.
 * 3. Clique em Implantar → Nova implantação → engrenagem → "App da Web".
 *    Executar como: Eu. Quem pode acessar: Qualquer pessoa. → Implantar → autorize.
 * 4. Copie a URL que termina em /exec e coloque em CONFIG.leadEndpoint (assets/js/main.js).
 *
 * Cada lead tem um id. A etapa 1 do formulário (nome, e-mail, WhatsApp) cria a linha;
 * a etapa 2 (cidade e perguntas) completa a mesma linha. Assim, quem desiste no meio
 * também fica registrado.
 */
const COLS = ['id', 'data_hora', 'etapa', 'nome', 'email', 'whatsapp', 'cidade', 'disponibilidade', 'investimento',
  'qualificado', 'formulario', 'pagina', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid'];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const d = JSON.parse(e.postData.contents);
    d.data_hora = Utilities.formatDate(new Date(), 'America/Manaus', 'dd/MM/yyyy HH:mm');
    // evita que um texto digitado vire fórmula na planilha
    const safe = (v) => { v = v === undefined || v === null ? '' : String(v); return /^[=+\-@]/.test(v) ? "'" + v : v; };
    const row = COLS.map((c) => safe(d[c]));
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    if (sh.getLastRow() === 0) sh.appendRow(COLS);
    const ids = sh.getRange(1, 1, sh.getLastRow(), 1).getValues().map((r) => String(r[0]));
    const i = d.id ? ids.indexOf(String(d.id)) : -1;
    if (i > 0) {
      // mesmo lead: completa a linha sem apagar o que já estava preenchido
      const range = sh.getRange(i + 1, 1, 1, COLS.length);
      const old = range.getValues()[0];
      range.setValues([row.map((v, k) => (v === '' ? old[k] : v))]);
    } else {
      sh.appendRow(row);
    }
    return ContentService.createTextOutput('ok');
  } finally {
    lock.releaseLock();
  }
}
