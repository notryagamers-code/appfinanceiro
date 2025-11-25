import { useEffect, useState, useRef } from "react";
import "./movimentacoes.css";
import { gerarRelatorioResumido } from "../utils/gerarRelatorioResumido";



// ---------------- helpers ----------------
function gerarHash() {
    return Math.random().toString(36).substring(2, 10);
}
function formatarData(d) {
    if (!d) return "";
    const dt = new Date(d + "T00:00:00");
    return dt.toLocaleDateString("pt-BR").replace(/\//g, "-");
}
function formatarBR(v) {
    return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function mascaraMoedaAmigavel(valor) {
    if (!valor) return "R$ 0,00";

    let v = valor.toString().replace(/\D/g, "");
    if (!v) return "R$ 0,00";

    v = (parseInt(v, 10) / 100).toFixed(2) + "";
    v = v.replace(".", ",");

    const partes = v.split(",");
    partes[0] = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return "R$ " + partes.join(",");
}

function desmascararMoeda(valor) {
    if (!valor) return 0;
    return Number(valor.toString().replace(/\D/g, ""));
}


// parseDate: aceita 'YYYY-MM-DD' ou 'DD-MM-YYYY' ou 'YYYY/MM/DD'.
// Retorna um objeto Date. Se não der pra parsear, retorna Invalid Date.
function parseDate(dateStr) {
    if (!dateStr) return new Date(NaN);
    if (dateStr instanceof Date) return dateStr;
    if (/^\d{4}[-/]\d{2}[-/]\d{2}$/.test(dateStr)) {
        return new Date(dateStr + "T00:00:00");
    }
    let m = /^(\d{2})[-/](\d{2})[-/](\d{4})$/.exec(dateStr);
    if (m) {
        const dia = Number(m[1]), mes = Number(m[2]) - 1, ano = Number(m[3]);
        return new Date(ano, mes, dia);
    }
    const d = new Date(dateStr);
    return d;
}

// ---------------- component ----------------
export default function Movimentacoes() {
    // dados
    const [dados, setDados] = useState([]);
    const [fornecedores, setFornecedores] = useState([]);

    // UI
    const [modalAberto, setModalAberto] = useState(false);
    const [selectorOpen, setSelectorOpen] = useState(false);
    const [selectorQuery, setSelectorQuery] = useState("");


    // edição
    const [editando, setEditando] = useState(null);

    // form
    const [form, setForm] = useState({
        id_fornecedor: "",
        nome_fornecedor: "",
        data: "",
        numero_documento: "",
        valor: "",
        percentual_retido: "",
        retido: ""
    });

    // filtros ativos (chips)
    const [filtrosAtivos, setFiltrosAtivos] = useState([]);

    // painel lateral (opção C)
    const [painelLateralAberto, setPainelLateralAberto] = useState(false);

    // filtro de datas específicos (painel lateral)
    const [filtroDataInicio, setFiltroDataInicio] = useState("");
    const [filtroDataFim, setFiltroDataFim] = useState("");

    // paginação
    const [pagina, setPagina] = useState(1);
    const [limit, setLimit] = useState(20);

    // ordenação
    const [sortConfig, setSortConfig] = useState({ coluna: null, direction: "asc" });

    // timeline (ano/mes)
    const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear());
    const [mesSelecionado, setMesSelecionado] = useState(null); // null = geral
    const meses = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

    // filtro basico (texto)
    const [filtro, setFiltro] = useState({ fornecedor: "", dataInicio: "", dataFim: "" });

    // autocomplete (input) states
    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [highlight, setHighlight] = useState(-1);

    // refs
    const suggestionsRef = useRef(null);
    const selectorRef = useRef(null);
    const modalRef = useRef(null);

    // filtros disponiveis para chips (exemplo; você pode popular dinamicamente)
    const opcoesFiltro = [

    ];
    const [modalRelatorioAberto, setModalRelatorioAberto] = useState(false);

    const [opcoesRelatorio, setOpcoesRelatorio] = useState({
        dataInicio: "",
        dataFim: "",
        ordenacao: "data",
    });


    // carregar dados
    function carregarMov() {
        fetch("https://appfinanceiro-23oq.onrender.com/api/movimentacoes")
        fetch("https://appfinanceiro-23oq.onrender.com/api/movimentacoes")
            .then(r => r.json())
            .then(setDados)
            .catch(() => setDados([]));
    }
    function carregarFornecedores() {
        fetch("https://appfinanceiro-23oq.onrender.com/api/fornecedores")
        fetch("https://appfinanceiro-23oq.onrender.com/api/fornecedores")
            .then(r => r.json())
            .then(setFornecedores)
            .catch(() => setFornecedores([]));
    }

    useEffect(() => {
        carregarMov();
        carregarFornecedores();
    }, []);

    // ---------------- FILTRO PRINCIPAL (aplica timeline + intervalo lateral + texto) ----------------
    const dadosFiltrados = dados.filter(m => {
        const nomeFornecedor = fornecedores.find(f => f.id == m.id_fornecedor)?.nome || "";
        const dataMov = parseDate(m.data);
        if (isNaN(dataMov.getTime())) return false;

        // timeline filters
        const anoOK = dataMov.getFullYear() === anoSelecionado;
        const mesOK = mesSelecionado === null || dataMov.getMonth() === mesSelecionado;

        // lateral date interval (if set) - these override/filter further
        const inicioOK = !filtroDataInicio || dataMov >= new Date(filtroDataInicio + "T00:00:00");
        const fimOK = !filtroDataFim || dataMov <= new Date(filtroDataFim + "T23:59:59");

        // text filter
        const textOK = !filtro.fornecedor ||
            nomeFornecedor.toLowerCase().includes(filtro.fornecedor.toLowerCase()) ||
            String(m.id_fornecedor).includes(filtro.fornecedor);

        // custom chip filters (example behavior)
        let chipsOK = true;
        filtrosAtivos.forEach(chip => {
            if (chip.id === "prefeituras") {
                // example: include only names containing 'PREFEITURA'
                chipsOK = chipsOK && /PREFEITURA/i.test(nomeFornecedor);
            } else if (chip.id === "valor>10000") {
                chipsOK = chipsOK && Number(m.valor) > 10000;
            } else if (chip.id === "s1000") {
                chipsOK = chipsOK && String(m.tipo_evento || "").includes("S-1000");
            }
        });

        return anoOK && mesOK && inicioOK && fimOK && textOK && chipsOK;
    });

    // ---------------- ORDENAÇÃO ----------------
    function ordenar(coluna) {
        let direction = "asc";
        if (sortConfig.coluna === coluna && sortConfig.direction === "asc") direction = "desc";
        setSortConfig({ coluna, direction });
    }
    const dadosOrdenados = [...dadosFiltrados].sort((a, b) => {
        if (!sortConfig.coluna) return 0;

        let x = a[sortConfig.coluna];
        let y = b[sortConfig.coluna];

        if (sortConfig.coluna === "fornecedor") {
            const fx = fornecedores.find(f => f.id == a.id_fornecedor)?.nome || "";
            const fy = fornecedores.find(f => f.id == b.id_fornecedor)?.nome || "";
            x = fx.toLowerCase();
            y = fy.toLowerCase();
        }
        if (sortConfig.coluna === "data") {
            x = parseDate(a.data);
            y = parseDate(b.data);
        }
        if (x < y) return sortConfig.direction === "asc" ? -1 : 1;
        if (x > y) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
    });

    // ---------------- PAGINAÇÃO ----------------
    const start = (pagina - 1) * limit;
    const end = start + limit;
    const dadosPaginados = dadosOrdenados.slice(start, end);
    const totalPaginas = Math.max(1, Math.ceil(dadosOrdenados.length / limit));

    const totalValores = dadosFiltrados.reduce((s, m) => s + Number(m.valor), 0);
    const totalRetido = dadosFiltrados.reduce((s, m) => s + Number(m.retido), 0);

    // ---------------- AUTOCOMPLETE ----------------
    function handleQueryChange(v) {
        setQuery(v);
        setShowSuggestions(true);
        setHighlight(-1);
        const q = v.trim().toLowerCase();
        if (!q) {
            setForm(prev => ({ ...prev, id_fornecedor: "", nome_fornecedor: "" }));
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }
        const matches = fornecedores
            .filter(f => String(f.id).includes(q) || f.nome.toLowerCase().includes(q))
            .slice(0, 5);
        setSuggestions(matches);
    }
    function selectSuggestion(f) {
        setForm(prev => ({ ...prev, id_fornecedor: f.id, nome_fornecedor: f.nome }));
        setQuery(`${f.id} - ${f.nome}`);
        setShowSuggestions(false);
    }
    function onInputKeyDown(e) {
        if (!showSuggestions) return;
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight(h => Math.min(h + 1, suggestions.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight(h => Math.max(h - 1, 0));
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (highlight >= 0) selectSuggestion(suggestions[highlight]);
        } else if (e.key === "Escape") {
            setShowSuggestions(false);
        }
    }

    // outside click handlers
    useEffect(() => {
        function onDocClick(e) {
            if (suggestionsRef.current && !suggestionsRef.current.contains(e.target)) setShowSuggestions(false);
            if (selectorRef.current && !selectorRef.current.contains(e.target)) setSelectorOpen(false);
            // close lateral if click outside? keep it manual; do not auto-close
        }
        document.addEventListener("mousedown", onDocClick);
        return () => document.removeEventListener("mousedown", onDocClick);
    }, []);

    // selector list
    const filteredSelector = fornecedores.filter(f =>
        f.nome.toLowerCase().includes(selectorQuery.toLowerCase()) || String(f.id).includes(selectorQuery)
    );
    function chooseFromSelector(f) {
        setForm(prev => ({ ...prev, id_fornecedor: f.id, nome_fornecedor: f.nome }));
        setQuery(`${f.id} - ${f.nome}`);
        setSelectorOpen(false);
        setShowSuggestions(false);
    }

    // ---------------- modal actions ----------------
    function novaMov() {
        setEditando(null);
        setForm({ id_fornecedor: "", nome_fornecedor: "", data: "", numero_documento: "", valor: "", percentual_retido: "4.80", retido: "" });
        setQuery("");
        setModalAberto(true);
    }
    function editar(m) {
        const f = fornecedores.find(x => x.id == m.id_fornecedor);

        // converte valores salvos (em reais) para centavos inteiros
        const valorCentavos = Math.round(Number(m.valor) * 100);   // ex: 1200.00 -> 120000
        const retidoCentavos = Math.round(Number(m.retido) * 100);

        setEditando(m.id);
        setForm({
            ...m,
            nome_fornecedor: f ? f.nome : "",
            valor: String(valorCentavos),           // armazenamos SOMENTE NÚMEROS (centavos)
            percentual_retido: m.percentual_retido, // mantemos o percentual
            retido: String(retidoCentavos)          // também em centavos
        });

        setQuery(f ? `${f.id} - ${f.nome}` : "");
        setModalAberto(true);
        setShowSuggestions(false);
    }


    function salvar() {
        if (!form.id_fornecedor || !form.nome_fornecedor)
            return alert("Escolha um fornecedor válido.");
        if (!form.data) return alert("Informe a data.");
        if (!form.valor) return alert("Informe o valor.");

        // transformar valores em centavos
        const valorCentavos = desmascararMoeda(form.valor);
        const retidoCentavos = desmascararMoeda(form.retido);

        const novo = {
            ...form,
            id: editando ? form.id : gerarHash(),
            valor: valorCentavos / 100,
            percentual_retido: Number(form.percentual_retido),
            retido: retidoCentavos / 100
        };

        const metodo = editando ? "PUT" : "POST";
        const url = editando
            ? `https://appfinanceiro-23oq.onrender.com/api/movimentacoes/${editando}`
            : "https://appfinanceiro-23oq.onrender.com/api/movimentacoes";
        fetch(url, {
            method: metodo,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(novo)
        }).then(() => {
            carregarMov();
            setModalAberto(false);
        });
    }


    function excluir(id) {
        if (!confirm("Deseja excluir ?")) return;
        fetch(`https://appfinanceiro-23oq.onrender.com/api/movimentacoes/${id}`, { method: "DELETE" }).then(() => carregarMov());
    }

    // ---------------- chips (filtros) ----------------
    function toggleFiltro(filtro) {
        setFiltrosAtivos(prev => {
            if (prev.some(x => x.id === filtro.id)) return prev.filter(x => x.id !== filtro.id);
            return [...prev, filtro];
        });
    }
    function removerFiltro(id) {
        setFiltrosAtivos(prev => prev.filter(f => f.id !== id));
    }

    // aplicar / limpar painel lateral actions
    function aplicarFiltroLateral() {
        // just close panel; filtering is reactive because we use filtroDataInicio/fim in dadosFiltrados
        setPainelLateralAberto(false);
        // also add tag for the period
        if (filtroDataInicio || filtroDataFim) {
            const label = `Período: ${filtroDataInicio || "—"} até ${filtroDataFim || "—"}`;
            // ensure unique id 'periodo' for date chip
            setFiltrosAtivos(prev => {
                const semPeriodo = prev.filter(p => p.id !== "periodo");
                return [...semPeriodo, { id: "periodo", label }];
            });
        } else {
            // remove periodo chip if none set
            setFiltrosAtivos(prev => prev.filter(p => p.id !== "periodo"));
        }
    }
    function limparFiltroLateral() {
        setFiltroDataInicio("");
        setFiltroDataFim("");
        setFiltrosAtivos(prev => prev.filter(p => p.id !== "periodo"));
    }

    // ---------------- render ----------------
    return (
        <div className="card">
            <div className="header">
                <h1>Movimentações</h1>
                <div className="header-actions">
                    <button className="btn" onClick={novaMov}>+ Nova Movimentação</button>
                </div>
            </div>

            {/* Timeline */}
            <div className="timeline-wrapper">
                <div className="timeline-left">
                    <button className="nav-arrow" onClick={() => setAnoSelecionado(a => a - 1)} aria-label="ano anterior">◄</button>
                    <div className="timeline-year">{anoSelecionado}</div>
                    <button className="nav-arrow" onClick={() => setAnoSelecionado(a => a + 1)} aria-label="próximo ano">►</button>
                </div>

                <div className="timeline-center">
                    <div className="timeline-line"></div>
                    <div className="timeline-months">
                        {meses.map((mes, index) => (
                            <div key={index} className={`month-item ${mesSelecionado === index ? "ativo" : ""}`} onClick={() => setMesSelecionado(index)}>
                                <span>{mes}</span>
                            </div>
                        ))}
                        <div className={`month-item geral ${mesSelecionado === null ? "ativo" : ""}`} onClick={() => setMesSelecionado(null)}>
                            <span>TODOS</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Toolbar Betha (left aligned) */}
            <div className="betha-toolbar">
                <div className="dropdown-item" onClick={() => setModalRelatorioAberto(true)}>
                    Imprimir
                </div>



                {/* search box */}
                <div className="betha-search-box">
                    <input type="text" placeholder="Pesquisar..." value={filtro.fornecedor} onChange={e => setFiltro({ ...filtro, fornecedor: e.target.value })} />
                    <button className="icon-btn" onClick={() => { /* keep simple: filter reacts to input */ }}>🔍</button>

                    {/* open lateral panel (filter) */}
                    <button className="icon-btn" onClick={() => setPainelLateralAberto(p => !p)}>⚙️</button>
                </div>
            </div>

            {/* tags area */}
            {filtrosAtivos.length > 0 && (
                <div className="betha-tags-area">
                    {filtrosAtivos.map(f => (
                        <div key={f.id} className="betha-tag">
                            {f.label}
                            <button className="tag-close" onClick={() => {
                                removerFiltro(f.id);
                                if (f.id === "periodo") { setFiltroDataInicio(""); setFiltroDataFim(""); }
                            }}>×</button>
                        </div>
                    ))}
                </div>
            )}

            {/* table */}
            <table className="tabela">
                <thead>
                    <tr>
                        <th className="sortable" onClick={() => ordenar("fornecedor")}>Fornecedor</th>
                        <th className="sortable" onClick={() => ordenar("data")}>Data</th>
                        <th>Nº Doc</th>
                        <th className="sortable" onClick={() => ordenar("valor")}>Valor</th>
                        <th className="sortable" onClick={() => ordenar("percentual_retido")}>%</th>
                        <th className="sortable" onClick={() => ordenar("retido")}>Retido</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {dadosPaginados.map(m => {
                        const f = fornecedores.find(x => x.id == m.id_fornecedor);
                        return (
                            <tr key={m.id}>
                                <td>{f ? `${f.nome} (${f.id})` : "—"}</td>
                                <td>{formatarData(m.data)}</td>
                                <td>{m.numero_documento}</td>
                                <td>{formatarBR(m.valor)}</td>
                                <td>{m.percentual_retido}%</td>
                                <td>{formatarBR(m.retido)}</td>
                                <td className="acoes">
                                    <button className="btn-edit" onClick={() => editar(m)}>Editar</button>
                                    <button className="btn-del" onClick={() => excluir(m.id)}>Excluir</button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
                <tfoot>
                    <tr>
                        <td colSpan="3" style={{ textAlign: "right", fontWeight: 700 }}>Totais:</td>
                        <td style={{ fontWeight: 700 }}>{formatarBR(totalValores)}</td>
                        <td></td>
                        <td style={{ fontWeight: 700 }}>{formatarBR(totalRetido)}</td>
                        <td></td>
                    </tr>
                </tfoot>
            </table>

            {/* paginação */}
            <div className="paginacao">
                <button disabled={pagina === 1} onClick={() => setPagina(pagina - 1)}>‹ Anterior</button>
                <span>Página {pagina} de {totalPaginas}</span>
                <button disabled={pagina === totalPaginas} onClick={() => setPagina(pagina + 1)}>Próxima ›</button>
                <select value={limit} onChange={e => { setLimit(Number(e.target.value)); setPagina(1); }}>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                </select>
            </div>

            {/* modal (unchanged) */}
            {modalAberto && (
                <div className="modal-bg">
                    <div className="modal modal-animated" role="dialog" aria-modal="true" ref={modalRef}>
                        <h2>{editando ? "Editar Movimentação" : "Nova Movimentação"}</h2>

                        {/* autocomplete + select button */}
                        <div className="field">
                            <label>Fornecedor:</label>
                            <div className="autocomplete-row">
                                <input
                                    className="autocomplete-input"
                                    placeholder="Digite nome ou ID"
                                    value={query || (form.id_fornecedor && form.nome_fornecedor ? `${form.id_fornecedor} - ${form.nome_fornecedor}` : "")}
                                    onChange={e => { handleQueryChange(e.target.value); setQuery(e.target.value); }}
                                    onKeyDown={onInputKeyDown}
                                    onFocus={() => setShowSuggestions(true)}
                                />
                            </div>

                            {/* suggestions dropdown (top 5) */}
                            <div ref={suggestionsRef} className="autocomplete-list-wrapper">
                                {showSuggestions && suggestions.length > 0 && (
                                    <div className="autocomplete-list">
                                        {suggestions.map((s, idx) => (
                                            <div
                                                key={s.id}
                                                className={`autocomplete-item ${idx === highlight ? "highlight" : ""}`}
                                                onMouseEnter={() => setHighlight(idx)}
                                                onMouseLeave={() => setHighlight(-1)}
                                                onMouseDown={(ev) => { ev.preventDefault(); selectSuggestion(s); }}
                                            >
                                                <div className="sel-name">{s.nome}</div>
                                                <div className="sel-meta">ID: {s.id} • CNPJ: {s.cnpj || "—"}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* selector panel (inline inside modal) */}
                        {selectorOpen && (
                            <div className="selector-panel" ref={selectorRef}>
                                <div className="selector-header">
                                    <input placeholder="Pesquisar fornecedor..." value={selectorQuery} onChange={e => setSelectorQuery(e.target.value)} />
                                    <button className="btn-close" onClick={() => setSelectorOpen(false)}>✕</button>
                                </div>
                                <div className="selector-list">
                                    {filteredSelector.length === 0 && <div className="muted">Nenhum fornecedor</div>}
                                    {filteredSelector.map(f => (
                                        <div key={f.id} className="selector-item" onClick={() => chooseFromSelector(f)}>
                                            <div className="sel-name">{f.nome}</div>
                                            <div className="sel-id">ID: {f.id} • CNPJ: {f.cnpj || "—"}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* form grid */}
                        <div className="grid">
                            <div className="field">
                                <label>Data:</label>
                                <input type="date" value={form.data} onChange={e => setForm(prev => ({ ...prev, data: e.target.value }))} />
                            </div>

                            <div className="field">
                                <label>Nº Documento:</label>
                                <input value={form.numero_documento} onChange={e => setForm(prev => ({ ...prev, numero_documento: e.target.value }))} />
                            </div>

                            <div className="field">
                                <label>Valor:</label>
                                <input
                                    type="text"
                                    value={mascaraMoedaAmigavel(form.valor)}
                                    onChange={(e) => {
                                        // limpa só números (centavos)
                                        let limpo = e.target.value.replace(/\D/g, "");
                                        if (!limpo) limpo = "0";

                                        const valorCentavos = Number(limpo); // já em centavos
                                        // pega percentual atual (pode vir com vírgula), normaliza para float
                                        const perc = Number(String(form.percentual_retido).replace(",", ".")) || 0;

                                        // retido em centavos = valorCentavos * perc / 100
                                        const retidoCentavos = Math.round((valorCentavos * perc) / 100);

                                        setForm(prev => ({
                                            ...prev,
                                            valor: String(valorCentavos),      // armazena centavos como string
                                            retido: String(retidoCentavos)     // armazena retido em centavos
                                        }));
                                    }}
                                />



                            </div>

                            <div className="field">
                                <label>% Retido:</label>
                                <input
                                    type="number"
                                    value={form.percentual_retido}
                                    onChange={e => {
                                        // mantemos o texto como o usuário digita (ex: "5,2" ou "5.2")
                                        const novoPercRaw = e.target.value;
                                        const perc = Number(String(novoPercRaw).replace(",", ".")) || 0;

                                        const valorCentavos = Number(form.valor) || 0; // já em centavos
                                        const retidoCentavos = Math.round((valorCentavos * perc) / 100);

                                        setForm(prev => ({
                                            ...prev,
                                            percentual_retido: novoPercRaw,
                                            retido: String(retidoCentavos)
                                        }));
                                    }}

                                />

                            </div>

                            <div className="field full">
                                <label>Retido (R$):</label>
                                <input
                                    type="text"
                                    value={mascaraMoedaAmigavel(form.retido)}
                                    onChange={(e) => {
                                        let limpo = e.target.value.replace(/\D/g, "");
                                        if (!limpo) limpo = "0";

                                        setForm(prev => ({
                                            ...prev,
                                            retido: limpo
                                        }));
                                    }}
                                />


                            </div>
                        </div>

                        <div className="modal-actions">
                            <button className="btn" onClick={salvar}>Salvar</button>
                            <button className="btn-cancel" onClick={() => setModalAberto(false)}>Cancelar</button>
                        </div>
                    </div>
                </div>
            )}
            {modalRelatorioAberto && (
                <div className="modal-bg">
                    <div className="modal modal-animated">

                        <h2>Opções do Relatório</h2>

                        <div className="grid">
                            <div className="field">
                                <label>Data Inicial:</label>
                                <input
                                    type="date"
                                    value={opcoesRelatorio.dataInicio}
                                    onChange={e => setOpcoesRelatorio(p => ({ ...p, dataInicio: e.target.value }))}
                                />
                            </div>

                            <div className="field">
                                <label>Data Final:</label>
                                <input
                                    type="date"
                                    value={opcoesRelatorio.dataFim}
                                    onChange={e => setOpcoesRelatorio(p => ({ ...p, dataFim: e.target.value }))}
                                />
                            </div>

                            <div className="field full">
                                <label>Ordenar por:</label>
                                <select
                                    value={opcoesRelatorio.ordenacao}
                                    onChange={e => setOpcoesRelatorio(p => ({ ...p, ordenacao: e.target.value }))}
                                >
                                    <option value="data">Data</option>
                                    <option value="numero_documento">Número do Documento</option>
                                    <option value="fornecedor">Fornecedor</option>
                                    <option value="valor">Valor</option>
                                </select>
                            </div>

                        </div>

                        <div className="modal-actions">
                            <button
                                className="btn"
                                onClick={() => {
                                    gerarRelatorioResumido(
                                        dadosFiltrados,
                                        fornecedores,
                                        opcoesRelatorio
                                    );
                                    setModalRelatorioAberto(false);
                                }}

                            >
                                Gerar PDF
                            </button>

                            <button className="btn-cancel" onClick={() => setModalRelatorioAberto(false)}>
                                Cancelar
                            </button>
                        </div>

                    </div>
                </div>
            )}

            {/* lateral panel (right) - OPÇÃO C */}
            <div className={`lateral-panel ${painelLateralAberto ? "open" : ""}`}>
                <div className="lateral-header">
                    <h3>Filtros</h3>
                    <button onClick={() => setPainelLateralAberto(false)}>✕</button>
                </div>

                <div className="lateral-section">
                    <h4>Período</h4>
                    <div className="linha-datas">
                        <div>
                            <label>De:</label>
                            <input type="date" value={filtroDataInicio} onChange={e => setFiltroDataInicio(e.target.value)} />
                        </div>
                        <div>
                            <label>Até:</label>
                            <input type="date" value={filtroDataFim} onChange={e => setFiltroDataFim(e.target.value)} />
                        </div>
                    </div>
                    <div className="filtro-acoes">
                        <button className="betha-btn aplicar" onClick={aplicarFiltroLateral}>Aplicar</button>
                        <button className="betha-btn limpar" onClick={limparFiltroLateral}>Limpar</button>
                    </div>
                </div>

                <div className="lateral-section">
                    <h4>Filtros rápidos</h4>
                    <div className="filtro-itens">
                        {opcoesFiltro.map(f => (
                            <div key={f.id} className={`filtro-opcao ${filtrosAtivos.some(x => x.id === f.id) ? "selecionado" : ""}`} onClick={() => toggleFiltro(f)}>
                                {f.label}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* overlay to close lateral when open (optional) */}
            {painelLateralAberto && <div className="lateral-overlay" onClick={() => setPainelLateralAberto(false)}></div>}
        </div>
    );
}
