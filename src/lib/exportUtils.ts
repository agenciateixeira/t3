import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ============================================
// EXCEL EXPORTS
// ============================================

export const exportTasksToExcel = async (tasks: any[]) => {
  const data = tasks.map((task) => ({
    'ID': task.id,
    'Título': task.title,
    'Status': getStatusLabel(task.status),
    'Prioridade': getPriorityLabel(task.priority),
    'Cliente': task.client?.name || 'N/A',
    'Responsável': task.assignee?.full_name || 'Não atribuído',
    'Data de Vencimento': task.due_date ? new Date(task.due_date).toLocaleDateString('pt-BR') : 'N/A',
    'Criado em': new Date(task.created_at).toLocaleDateString('pt-BR'),
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Tarefas');

  // Ajustar largura das colunas
  const colWidths = [
    { wch: 10 },  // ID
    { wch: 40 },  // Título
    { wch: 15 },  // Status
    { wch: 15 },  // Prioridade
    { wch: 25 },  // Cliente
    { wch: 25 },  // Responsável
    { wch: 15 },  // Data Vencimento
    { wch: 15 },  // Criado em
  ];
  ws['!cols'] = colWidths;

  const fileName = `tarefas_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

export const exportDealsToExcel = async (deals: any[]) => {
  const data = deals.map((deal) => ({
    'ID': deal.id,
    'Título': deal.title,
    'Cliente': deal.client?.name || 'N/A',
    'Valor': formatCurrency(deal.value || 0),
    'Probabilidade': `${deal.probability}%`,
    'Etapa': deal.stage?.name || 'N/A',
    'Responsável': deal.assignee?.full_name || 'Não atribuído',
    'Previsão Fechamento': deal.expected_close_date ? new Date(deal.expected_close_date).toLocaleDateString('pt-BR') : 'N/A',
    'Criado em': new Date(deal.created_at).toLocaleDateString('pt-BR'),
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Deals');

  const colWidths = [
    { wch: 10 },  // ID
    { wch: 35 },  // Título
    { wch: 25 },  // Cliente
    { wch: 15 },  // Valor
    { wch: 12 },  // Probabilidade
    { wch: 20 },  // Etapa
    { wch: 25 },  // Responsável
    { wch: 18 },  // Previsão
    { wch: 15 },  // Criado em
  ];
  ws['!cols'] = colWidths;

  const fileName = `deals_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

export const exportClientsToExcel = async (clients: any[]) => {
  const data = clients.map((client) => ({
    'ID': client.id,
    'Nome': client.name,
    'Email': client.email || 'N/A',
    'Telefone': client.phone || 'N/A',
    'CNPJ': client.cnpj || 'N/A',
    'Cidade': client.city || 'N/A',
    'Estado': client.state || 'N/A',
    'Criado em': new Date(client.created_at).toLocaleDateString('pt-BR'),
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Clientes');

  const colWidths = [
    { wch: 10 },  // ID
    { wch: 30 },  // Nome
    { wch: 30 },  // Email
    { wch: 18 },  // Telefone
    { wch: 18 },  // CNPJ
    { wch: 20 },  // Cidade
    { wch: 10 },  // Estado
    { wch: 15 },  // Criado em
  ];
  ws['!cols'] = colWidths;

  const fileName = `clientes_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

export const exportTimeLogsToExcel = async (timeLogs: any[]) => {
  const data = timeLogs.map((log) => ({
    'ID': log.id,
    'Usuário': log.user?.full_name || 'N/A',
    'Tarefa': log.task?.title || 'N/A',
    'Deal': log.deal?.title || 'N/A',
    'Início': new Date(log.start_time).toLocaleString('pt-BR'),
    'Fim': log.end_time ? new Date(log.end_time).toLocaleString('pt-BR') : 'Em andamento',
    'Duração': formatDuration(log.duration_seconds || 0),
    'Status': log.is_active ? 'Ativo' : 'Finalizado',
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Time Logs');

  const colWidths = [
    { wch: 10 },  // ID
    { wch: 25 },  // Usuário
    { wch: 30 },  // Tarefa
    { wch: 30 },  // Deal
    { wch: 20 },  // Início
    { wch: 20 },  // Fim
    { wch: 15 },  // Duração
    { wch: 12 },  // Status
  ];
  ws['!cols'] = colWidths;

  const fileName = `time_logs_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

// ============================================
// PDF EXPORTS
// ============================================

export const exportTasksToPDF = async (tasks: any[]) => {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(18);
  doc.text('Relatório de Tarefas', 14, 15);
  doc.setFontSize(10);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 22);

  // Table
  const tableData = tasks.map((task) => [
    task.title,
    getStatusLabel(task.status),
    getPriorityLabel(task.priority),
    task.client?.name || 'N/A',
    task.assignee?.full_name || 'Não atribuído',
    task.due_date ? new Date(task.due_date).toLocaleDateString('pt-BR') : 'N/A',
  ]);

  autoTable(doc, {
    startY: 30,
    head: [['Título', 'Status', 'Prioridade', 'Cliente', 'Responsável', 'Vencimento']],
    body: tableData,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [45, 180, 175] },
  });

  doc.save(`tarefas_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const exportDealsToPDF = async (deals: any[]) => {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(18);
  doc.text('Relatório de Deals', 14, 15);
  doc.setFontSize(10);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 22);

  // Table
  const tableData = deals.map((deal) => [
    deal.title,
    deal.client?.name || 'N/A',
    formatCurrency(deal.value || 0),
    `${deal.probability}%`,
    deal.stage?.name || 'N/A',
    deal.assignee?.full_name || 'Não atribuído',
  ]);

  autoTable(doc, {
    startY: 30,
    head: [['Título', 'Cliente', 'Valor', 'Prob.', 'Etapa', 'Responsável']],
    body: tableData,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [45, 180, 175] },
  });

  doc.save(`deals_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const exportRevenueReportToPDF = async (
  revenueData: any[],
  currentTotal: number,
  previousTotal: number,
  growthPercentage: number,
  period: string
) => {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(20);
  doc.text('Relatório de Faturamento', 14, 15);
  doc.setFontSize(10);
  doc.text(`Período: ${period}`, 14, 22);
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 27);

  // Summary boxes
  doc.setFontSize(12);
  doc.setFillColor(45, 180, 175);
  doc.rect(14, 35, 60, 25, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text('Período Atual', 16, 42);
  doc.setFontSize(16);
  doc.text(formatCurrency(currentTotal), 16, 52);

  doc.setFillColor(156, 163, 175);
  doc.rect(80, 35, 60, 25, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.text('Período Anterior', 82, 42);
  doc.setFontSize(16);
  doc.text(formatCurrency(previousTotal), 82, 52);

  const growthColor = growthPercentage >= 0 ? [34, 197, 94] : [239, 68, 68];
  doc.setFillColor(...growthColor);
  doc.rect(146, 35, 50, 25, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.text('Crescimento', 148, 42);
  doc.setFontSize(16);
  doc.text(`${growthPercentage >= 0 ? '+' : ''}${growthPercentage.toFixed(1)}%`, 148, 52);

  // Reset color
  doc.setTextColor(0, 0, 0);

  // Table
  const tableData = revenueData.map((item) => [
    item.label,
    formatCurrency(item.current),
    formatCurrency(item.previous),
    formatCurrency(item.current - item.previous),
  ]);

  autoTable(doc, {
    startY: 70,
    head: [['Período', 'Atual', 'Anterior', 'Diferença']],
    body: tableData,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [45, 180, 175] },
  });

  doc.save(`faturamento_${new Date().toISOString().split('T')[0]}.pdf`);
};

// ============================================
// HELPER FUNCTIONS
// ============================================

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'todo':
      return 'A fazer';
    case 'in_progress':
      return 'Em andamento';
    case 'done':
      return 'Concluída';
    default:
      return status;
  }
};

const getPriorityLabel = (priority: string) => {
  switch (priority) {
    case 'high':
      return 'Alta';
    case 'medium':
      return 'Média';
    case 'low':
      return 'Baixa';
    default:
      return priority;
  }
};
