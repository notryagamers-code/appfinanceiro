import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// helpers ------------------------
function formatarData(d) {
    if (!d) return "";
    return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
}

function formatarBR(v) {
    return Number(v || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

// principal ----------------------
export function gerarRelatorioMovimentacoes(dados, fornecedores, opcoes) {
    const { dataInicio, dataFim, ordenacao } = opcoes;

    const doc = new jsPDF("p", "pt", "a4");

    doc.setFontSize(16);
    doc.text("Relatório de Movimentações", 40, 40);

    // filtro visual
    doc.setFontSize(12);
    doc.text(
        `Período: ${dataInicio || "—"} até ${dataFim || "—"} | Ordenado por: ${ordenacao}`,
        40,
        65
    );

    // 1) aplicar filtros por data
    let lista = [...dados];

    if (dataInicio)
        lista = lista.filter(m => new Date(m.data) >= new Date(dataInicio));

    if (dataFim)
        lista = lista.filter(m => new Date(m.data) <= new Date(dataFim + "T23:59:59"));

    // 2) ordenar conforme escolha
    lista.sort((a, b) => {
        if (ordenacao === "fornecedor") {
            const fx = fornecedores.find(f => f.id == a.id_fornecedor)?.nome || "";
            const fy = fornecedores.find(f => f.id == b.id_fornecedor)?.nome || "";
            return fx.localeCompare(fy);
        }
        if (a[ordenacao] < b[ordenacao]) return -1;
        if (a[ordenacao] > b[ordenacao]) return 1;
        return 0;
    });

    // 3) agrupamento por CNPJ
    const grupos = {};
    lista.forEach(m => {
        const fornecedor = fornecedores.find(f => f.id == m.id_fornecedor);
        const chave = fornecedor?.cnpj || "SEM CNPJ";

        if (!grupos[chave]) grupos[chave] = [];
        grupos[chave].push(m);
    });

    let posY = 100;
    let totalGeralValor = 0;
    let totalGeralRetido = 0;

    Object.keys(grupos).forEach(cnpj => {
        const grupo = grupos[cnpj];
        const primeiro = fornecedores.find(f => f.id == grupo[0]?.id_fornecedor);

        doc.setFontSize(14);
        doc.text(`${primeiro?.nome || "Fornecedor"} - CNPJ: ${cnpj}`, 40, posY);

        posY += 15;

        // preparar tabela
        const body = grupo.map(item => {
            return [
                formatarData(item.data),
                item.numero_documento,
                formatarBR(item.valor),
                item.percentual_retido + "%",
                formatarBR(item.retido)
            ];
        });

        autoTable(doc, {
            startY: posY,
            head: [["Data", "Nº Doc", "Valor", "%", "Retido"]],
            body,
            theme: "grid",
            styles: { fontSize: 10 },
            margin: { left: 40, right: 40 },
            didDrawPage: data => {
                posY = data.cursor.y;
            }
        });

        // total por fornecedor
        const totalValor = grupo.reduce((s, x) => s + Number(x.valor), 0);
        const totalRetido = grupo.reduce((s, x) => s + Number(x.retido), 0);

        doc.setFontSize(12);
        doc.text(
            `Total ${primeiro?.nome}: ${formatarBR(totalValor)} | Retido: ${formatarBR(totalRetido)}`,
            40,
            posY + 20
        );

        posY += 40;

        totalGeralValor += totalValor;
        totalGeralRetido += totalRetido;
    });

    // total geral
    doc.setFontSize(16);
    doc.text(
        `TOTAL GERAL — Valor: ${formatarBR(totalGeralValor)} | Retido: ${formatarBR(totalGeralRetido)}`,
        40,
        posY + 20
    );

    doc.save("relatorio-movimentacoes.pdf");
}
