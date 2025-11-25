import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function formatarBR(v) {
    return Number(v || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function formatarData(d) {
    if (!d) return "";
    return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
}

function dataEmissaoPDF() {
    const hoje = new Date();
    return hoje.toLocaleDateString("pt-BR").replace(/\//g, "-"); // 17-11-2025
}

export function gerarRelatorioResumido(dados, fornecedores, opcoes) {
    const { dataInicio, dataFim } = opcoes;

    const doc = new jsPDF("p", "pt", "a4");

    // Título
    doc.setFontSize(16);
    doc.text("Resumo de Faturamento", 40, 40);

    // Período corretamente formatado
    doc.setFontSize(12);
    doc.text(
        `Período: ${formatarData(dataInicio) || "—"} até ${formatarData(dataFim) || "—"}`,
        40,
        60
    );

    // Filtro por data
    let lista = [...dados];

    if (dataInicio)
        lista = lista.filter(m => new Date(m.data) >= new Date(dataInicio));

    if (dataFim)
        lista = lista.filter(m => new Date(m.data) <= new Date(dataFim + "T23:59:59"));

    // AGRUPAMENTO por CNPJ
    const grupos = {};

    lista.forEach(m => {
        const fornecedor = fornecedores.find(f => f.id == m.id_fornecedor);
        const cnpj = fornecedor?.cnpj || "SEM CNPJ";

        if (!grupos[cnpj]) {
            grupos[cnpj] = {
                nome: fornecedor?.nome || "",
                cnpj: cnpj,
                totalValor: 0,
                totalRetido: 0,
                percentual: Number(m.percentual_retido || 0)
            };
        }

        grupos[cnpj].totalValor += Number(m.valor);
        grupos[cnpj].totalRetido += Number(m.retido);
    });

    // Montagem das linhas
    const linhas = Object.values(grupos).map(g => [
        g.cnpj,
        formatarBR(g.totalValor),
        g.percentual.toFixed(2) + "%",
        formatarBR(g.totalRetido)
    ]);

    // TOTAL GERAL
    const totalGeralValor = Object.values(grupos).reduce((s, g) => s + g.totalValor, 0);
    const totalGeralRetido = Object.values(grupos).reduce((s, g) => s + g.totalRetido, 0);

    // Tabela
    autoTable(doc, {
        startY: 90,
        head: [["TOMADOR/CNPJ", "VALOR BRUTO", "%", "VALOR RETIDO"]],
        body: linhas,
        theme: "grid",
        styles: { fontSize: 11 },
        headStyles: {
            fillColor: [60, 60, 60],
            textColor: 255
        },
        margin: { left: 40, right: 40 }
    });

    // Total Geral
    const finalY = doc.lastAutoTable.finalY + 30;

    doc.setFontSize(14);
    doc.text(
        `TOTAL GERAL — Valor Bruto: ${formatarBR(totalGeralValor)}     Retido: ${formatarBR(totalGeralRetido)}`,
        40,
        finalY
    );

    // Nome do arquivo com data de emissão
    const nomeArquivo = `resumo-faturamento-${dataEmissaoPDF()}.pdf`;

    doc.save(nomeArquivo);
}
