import { useMemo } from "react";
import {
    BarChart, Bar, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip,
    PieChart, Pie, ResponsiveContainer, Cell
} from "recharts";
import "./dashboard.css";

export default function Dashboard({ dados = [], fornecedores = [] }) {

    // Função para agrupar valores por ano
    const totaisAno = useMemo(() => {
        const mapa = {};
        dados.forEach(m => {
            const ano = new Date(m.data).getFullYear();
            if (!mapa[ano]) mapa[ano] = 0;
            mapa[ano] += Number(m.valor);
        });
        return Object.entries(mapa).map(([ano, valor]) => ({ ano, valor }));
    }, [dados]);

    // Totais por mês do ano atual
    const anoAtual = new Date().getFullYear();
    const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
        "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

    const totaisMes = meses.map((_, i) => {
        const total = dados
            .filter(m => {
                const dt = new Date(m.data);
                return dt.getFullYear() === anoAtual && dt.getMonth() === i;
            })
            .reduce((s, x) => s + Number(x.valor), 0);

        return { mes: meses[i], valor: total };
    });

    // Maior emissão
    const maior = dados.length
        ? dados.reduce((a, b) => Number(a.valor) > Number(b.valor) ? a : b)
        : null;

    // Top fornecedores
    const mapaFornecedor = {};
    dados.forEach(m => {
        const f = fornecedores.find(x => x.id == m.id_fornecedor);
        if (!f) return;
        if (!mapaFornecedor[f.nome]) mapaFornecedor[f.nome] = 0;
        mapaFornecedor[f.nome] += Number(m.valor);
    });

    const topFornecedores = Object.entries(mapaFornecedor)
        .map(([nome, valor]) => ({ nome, valor }))
        .slice(0, 6);

    const COLORS = ["#4f46e5", "#0ea5e9", "#22c55e",
        "#f97316", "#e11d48", "#6366f1"];

    return (
        <div className="dash-container">

            <h1 className="dash-title">Dashboard Financeiro</h1>

            {/* CARDS */}
            <div className="dash-cards">

                <div className="dash-card">
                    <h3>Total Ano Atual</h3>
                    <p>R$ {totaisMes.reduce((a, b) => a + b.valor, 0).toLocaleString("pt-BR")}</p>
                </div>

                <div className="dash-card">
                    <h3>Maior Emissão</h3>
                    <p>{maior ? "R$ " + Number(maior.valor).toLocaleString("pt-BR") : "—"}</p>
                </div>

                <div className="dash-card">
                    <h3>Total Geral</h3>
                    <p>R$ {dados.reduce((s, m) => s + Number(m.valor), 0).toLocaleString("pt-BR")}</p>
                </div>

            </div>

            {/* GRÁFICO MENSAL */}
            <div className="dash-card full">
                <h2>Total por Mês ({anoAtual})</h2>
                <div className="chart-box">
                    <ResponsiveContainer>
                        <BarChart data={totaisMes}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="mes" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="valor" fill="#4f46e5" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* GRÁFICO ANUAL */}
            <div className="dash-card full">
                <h2>Total por Ano</h2>
                <div className="chart-box">
                    <ResponsiveContainer>
                        <LineChart data={totaisAno}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="ano" />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="valor" stroke="#0ea5e9" strokeWidth={3} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* PIE - FORNECEDORES */}
            <div className="dash-card full">
                <h2>Top Fornecedores</h2>
                <div className="chart-box">
                    <ResponsiveContainer>
                        <PieChart>
                            <Pie data={topFornecedores} dataKey="valor" label>
                                {topFornecedores.map((_, i) => (
                                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

        </div>
    );
}
