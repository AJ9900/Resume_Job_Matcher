import { workflow, node, trigger, newCredential, expr } from '@n8n/workflow-sdk';

const start = trigger({
  type: 'n8n-nodes-base.executeWorkflowTrigger',
  version: 1.3,
  config: {
    name: 'When Called by Workflow',
    parameters: {
      inputSource: 'workflowInputs',
      workflowInputs: { values: [{ name: 'fileName', type: 'string' }, { name: 'content', type: 'string' }] },
    },
  },
});

const jsCode = String.raw`const md = String($json.content || '');
let fileName = String($json.fileName || 'Job_Matches.docx').trim();
fileName = fileName.replace(/[\\/:*?"<>|]/g, '_');
if (!fileName.toLowerCase().endsWith('.docx')) fileName = fileName + '.docx';

function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function runs(text, baseBold) {
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g);
  let out = '';
  for (const p of parts) {
    if (!p) continue;
    let bold = baseBold;
    let t = p;
    if (p.startsWith('**') && p.endsWith('**') && p.length > 4) { bold = true; t = p.slice(2, -2); }
    t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)');
    out += '<w:r>' + (bold ? '<w:rPr><w:b/></w:rPr>' : '') + '<w:t xml:space="preserve">' + esc(t) + '</w:t></w:r>';
  }
  return out;
}
function para(text, style, bold) {
  const pPr = style ? '<w:pPr><w:pStyle w:val="' + style + '"/></w:pPr>' : '';
  return '<w:p>' + pPr + runs(text, bold) + '</w:p>';
}
function cells(line) {
  let l = line.trim();
  if (l.startsWith('|')) l = l.slice(1);
  if (l.endsWith('|')) l = l.slice(0, -1);
  return l.split('|').map(c => c.trim());
}
function table(rows) {
  const border = '<w:tblBorders><w:top w:val="single" w:sz="4"/><w:left w:val="single" w:sz="4"/><w:bottom w:val="single" w:sz="4"/><w:right w:val="single" w:sz="4"/><w:insideH w:val="single" w:sz="4"/><w:insideV w:val="single" w:sz="4"/></w:tblBorders>';
  let x = '<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/>' + border + '</w:tblPr>';
  rows.forEach((r, i) => {
    x += '<w:tr>';
    for (const c of r) x += '<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/></w:tcPr>' + para(c, '', i === 0) + '</w:tc>';
    x += '</w:tr>';
  });
  return x + '</w:tbl><w:p/>';
}

const lines = md.split(/\r?\n/);
let body = '';
let tableRows = [];
const flushTable = () => { if (tableRows.length) { body += table(tableRows); tableRows = []; } };
for (const raw of lines) {
  const t = raw.trim();
  if (t.startsWith('|')) {
    if (/^[|\s:-]+$/.test(t)) continue;
    tableRows.push(cells(t));
    continue;
  }
  flushTable();
  if (!t) continue;
  const h = t.match(/^(#{1,6})\s+(.*)$/);
  if (h) { const lvl = Math.min(h[1].length, 3); body += para(h[2], lvl === 1 ? 'Title' : 'Heading' + (lvl - 1)); continue; }
  const b = t.match(/^[-*+]\s+(.*)$/);
  if (b) { body += para('\u2022 ' + b[1], 'ListParagraph'); continue; }
  const n = t.match(/^(\d+)[.)]\s+(.*)$/);
  if (n) { body += para(n[1] + '. ' + n[2], 'ListParagraph'); continue; }
  body += para(t, '');
}
flushTable();
if (!body) body = '<w:p/>';

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
const H = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const documentXml = H + '<w:document ' + W + '><w:body>' + body + '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body></w:document>';
const stylesXml = H + '<w:styles ' + W + '>' +
  '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120"/></w:pPr></w:pPrDefault></w:docDefaults>' +
  '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>' +
  '<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="40"/><w:color w:val="1F3864"/></w:rPr></w:style>' +
  '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="240"/></w:pPr><w:rPr><w:b/><w:sz w:val="32"/><w:color w:val="2F5496"/></w:rPr></w:style>' +
  '<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="200"/></w:pPr><w:rPr><w:b/><w:sz w:val="26"/><w:color w:val="2F5496"/></w:rPr></w:style>' +
  '<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:pPr><w:ind w:left="360"/></w:pPr></w:style>' +
  '</w:styles>';
const contentTypes = H + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>';
const rootRels = H + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
const docRels = H + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';

const bin = (s, name) => ({ data: Buffer.from(s, 'utf8').toString('base64'), mimeType: 'application/xml', fileName: name });
return {
  json: { fileName },
  binary: {
    ct: bin(contentTypes, '[Content_Types].xml'),
    rels: bin(rootRels, '_rels/.rels'),
    doc: bin(documentXml, 'word/document.xml'),
    styles: bin(stylesXml, 'word/styles.xml'),
    docrels: bin(docRels, 'word/_rels/document.xml.rels'),
  },
};`;

const build = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Build Word Document Parts', parameters: { mode: 'runOnceForEachItem', jsCode } },
});

const zip = node({
  type: 'n8n-nodes-base.compression',
  version: 1.1,
  config: {
    name: 'Package as docx',
    parameters: {
      operation: 'compress',
      binaryPropertyName: 'ct,rels,doc,styles,docrels',
      outputFormat: 'zip',
      fileName: expr('{{ $json.fileName }}'),
      binaryPropertyOutput: 'data',
    },
  },
});

const upload = node({
  type: 'n8n-nodes-base.googleDrive',
  version: 3,
  config: {
    name: 'Upload to Google Drive',
    parameters: {
      resource: 'file',
      operation: 'upload',
      inputDataFieldName: 'data',
      name: expr('{{ $("Build Word Document Parts").item.json.fileName }}'),
      driveId: { __rl: true, mode: 'list', value: 'My Drive' },
      folderId: { __rl: true, mode: 'list', value: 'root', cachedResultName: '/ (Root folder)' },
      options: { simplifyOutput: false },
    },
    credentials: { googleDriveOAuth2Api: newCredential('Google Drive account') },
    onError: 'continueErrorOutput',
  },
});

const saved = node({
  type: 'n8n-nodes-base.set',
  version: 3.5,
  config: {
    name: 'Return Saved Result',
    parameters: {
      mode: 'manual',
      assignments: {
        assignments: [
          { id: 'f1', name: 'fileName', type: 'string', value: expr('{{ $json.name }}') },
          { id: 'f2', name: 'fileUrl', type: 'string', value: expr('{{ $json.webViewLink || ("https://drive.google.com/file/d/" + $json.id + "/view") }}') },
          { id: 'f3', name: 'status', type: 'string', value: 'saved' },
        ],
      },
    },
  },
});

const failed = node({
  type: 'n8n-nodes-base.set',
  version: 3.5,
  config: {
    name: 'Return Error',
    parameters: {
      mode: 'manual',
      assignments: {
        assignments: [
          { id: 'e1', name: 'fileName', type: 'string', value: expr('{{ $("Build Word Document Parts").item.json.fileName }}') },
          { id: 'e2', name: 'fileUrl', type: 'string', value: '' },
          { id: 'e3', name: 'status', type: 'string', value: 'Error: could not upload the Word file to Google Drive' },
        ],
      },
    },
  },
});

export default workflow('save-job-matches-word', 'Save Job Matches to Word')
  .add(start)
  .to(build)
  .to(zip)
  .to(upload.to(saved).onError(failed));
