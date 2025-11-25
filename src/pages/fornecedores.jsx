import { useEffect, useState } from "react";
import "./fornecedores.css";

export default function Fornecedores() {
    const [dados, setDados] = useState([]);
    const [modalAberto, setModalAberto] = useState(false);
    const [editando, setEditando] = useState(null);

    const [form, setForm] = useState({
        nome: "",
        cnpj: "",
        fantasia: "",
        cep: "",
        logradouro: "",
        numero: "",
        complemento: "",
        bairro: "",
        municipio: "",
        uf: ""
    });

    const [erro, setErro] = useState("");

    // --- BUSCA ---
    const [busca, setBusca] = useState("");

    // --- PAGINAÇÃO ---
    const [pagina, setPagina] = useState(1);
    const [porPagina, setPorPagina] = useState(20);



    // Gera cor pastel determinística com base no texto do município
    function getMunicipioColor(muni) {
        if (!muni) return "#ccc";

        let hash = 0;
        for (let i = 0; i < muni.length; i++) {
            hash = muni.charCodeAt(i) + ((hash << 5) - hash);
        }

        const hue = Math.abs(hash % 360);
        return `hsl(${hue} 70% 85%)`; // cor mais clara e bonita
    }



    // carregar dados
    function carregar() {
        fetch("https://appfinanceiro-23oq.onrender.com/api/fornecedores")
            .then(res => res.json())
            .then(data => setDados(data));
    }

    useEffect(() => {
        carregar();
    }, []);


    // --- Máscara de CNPJ ---
    function mascaraCNPJ(v) {
        v = v.replace(/\D/g, "");
        v = v.replace(/(\d{2})(\d)/, "$1.$2");
        v = v.replace(/(\d{3})(\d)/, "$1.$2");
        v = v.replace(/(\d{3})(\d)/, "$1/$2");
        v = v.replace(/(\d{4})(\d{2})$/, "$1-$2");
        return v;
    }

    function validarCNPJ(cnpj) {
        return /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(cnpj);
    }

    // --- BUSCA AUTOMÁTICA CNPJ ---
    async function buscarCNPJ(cnpj) {
        const limpo = cnpj.replace(/\D/g, "");
        if (limpo.length !== 14) return;

        try {
            const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${limpo}`);
            if (!res.ok) {
                setErro("CNPJ não encontrado na Receita.");
                return;
            }

            const data = await res.json();
            setErro("");

            setForm(prev => ({
                ...prev,
                nome: data.razao_social || prev.nome,
                fantasia: data.nome_fantasia || "",
                cep: data.cep || "",
                logradouro: data.logradouro || "",
                numero: data.numero || "",
                complemento: data.complemento || "",
                bairro: data.bairro || "",
                municipio: data.municipio || "",
                uf: data.uf || ""
            }));
        } catch {
            setErro("Erro ao consultar a API.");
        }
    }

    // --- NOVO ---
    function novoFornecedor() {
        setEditando(null);
        setForm({
            nome: "",
            cnpj: "",
            fantasia: "",
            cep: "",
            logradouro: "",
            numero: "",
            complemento: "",
            bairro: "",
            municipio: "",
            uf: ""
        });
        setErro("");
        setModalAberto(true);
    }

    // --- EDITAR ---
    function editarFornecedor(f) {
        setEditando(f.id);
        setForm(f);
        setErro("");
        setModalAberto(true);
    }

    // --- SALVAR ---
    function salvar() {
        if (!form.nome.trim()) {
            setErro("O nome/razão social é obrigatório.");
            return;
        }

        if (!validarCNPJ(form.cnpj)) {
            setErro("CNPJ inválido.");
            return;
        }

        const cnpjLimpo = form.cnpj.replace(/\D/g, "");
        const idGerado = cnpjLimpo.substring(0, 5) + cnpjLimpo.slice(-2);
        const novoID = editando ? editando : String(idGerado);

        // ⛔ CHECAR ID DUPLICADO QUANDO FOR NOVO
        if (!editando && dados.some(f => f.id === novoID)) {
            setErro("ID já existe! Este fornecedor já foi cadastrado.");
            return;
        }

        const metodo = editando ? "PUT" : "POST";
        const url = editando
            ? `https://appfinanceiro-23oq.onrender.com/api/fornecedores/${editando}`
            : "https://appfinanceiro-23oq.onrender.com/api/fornecedores";

        const body = { id: novoID, ...form };

        fetch(url, {
            method: metodo,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        })
            .then(() => {
                carregar();
                setModalAberto(false);
            });
    }

    // --- EXCLUIR ---
    function excluir(id) {
        if (!confirm("Deseja realmente excluir?")) return;
        fetch(`https://appfinanceiro-23oq.onrender.com/api/fornecedores/${id}`, {
            method: "DELETE"
        }).then(() => carregar());
    }

    // === FILTRO + PAGINAÇÃO ===
    const filtrados = dados.filter(f =>
        f.nome.toLowerCase().includes(busca.toLowerCase()) ||
        f.municipio?.toLowerCase().includes(busca.toLowerCase())
    );


    const totalPaginas = Math.ceil(filtrados.length / porPagina);

    const inicio = (pagina - 1) * porPagina;
    const fim = inicio + porPagina;

    const dadosPaginados = filtrados.slice(inicio, fim);

    return (
        <div className="card">

            <div className="header">
                <h1>Fornecedores</h1>
                <button className="btn" onClick={novoFornecedor}>+ Novo Fornecedor</button>
            </div>

            {/* BUSCA */}
            <div className="busca-container">
                <input
                    type="text"
                    placeholder="Buscar..."
                    value={busca}
                    onChange={e => { setBusca(e.target.value); setPagina(1); }}
                    className="input-busca"
                />

                {busca.length > 0 && (
                    <button
                        className="btn-limpar"
                        onClick={() => { setBusca(""); setPagina(1); }}
                    >
                        ✕
                    </button>
                )}
            </div>


            <table className="tabela">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Fornecedor</th>
                        <th>CNPJ</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {dadosPaginados.map(f => (
                        <tr key={f.id}>
                            <td>{f.id}</td>

                            <td>
                                {f.nome}
                                {f.municipio && (
                                    <span
                                        className="tag-municipio"
                                        style={{
                                            backgroundColor: getMunicipioColor(f.municipio)
                                        }}
                                    >
                                        {f.municipio}
                                    </span>
                                )}
                            </td>

                            <td>{f.cnpj}</td>

                            <td className="acoes">
                                <button className="btn-edit" onClick={() => editarFornecedor(f)}>Editar</button>
                                <button className="btn-del" onClick={() => excluir(f.id)}>Excluir</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* PAGINAÇÃO */}
            <div className="paginacao">
                <div>
                    <label>Por página: </label>
                    <select
                        value={porPagina}
                        onChange={e => { setPorPagina(Number(e.target.value)); setPagina(1); }}
                    >
                        <option value="20">20</option>
                        <option value="50">50</option>
                    </select>
                </div>

                <div className="nav">
                    <button disabled={pagina === 1} onClick={() => setPagina(pagina - 1)}>Anterior</button>
                    <span>Página {pagina} de {totalPaginas}</span>
                    <button disabled={pagina === totalPaginas} onClick={() => setPagina(pagina + 1)}>Próxima</button>
                </div>
            </div>

            {/* Modal */}
            {modalAberto && (
                <div className="modal-bg">
                    <div className="modal">

                        <h2>{editando ? "Editar Fornecedor" : "Cadastrar Fornecedor"}</h2>

                        {erro && <p className="erro">{erro}</p>}

                        <label>CNPJ:</label>
                        <input
                            type="text"
                            maxLength={18}
                            value={form.cnpj}
                            onChange={e => {
                                const cnpj = mascaraCNPJ(e.target.value);
                                setForm({ ...form, cnpj });
                                buscarCNPJ(cnpj);
                            }}
                        />

                        <label>Razão Social:</label>
                        <input
                            type="text"
                            value={form.nome}
                            onChange={e => setForm({ ...form, nome: e.target.value })}
                        />

                        <label>Nome Fantasia:</label>
                        <input
                            type="text"
                            value={form.fantasia}
                            onChange={e => setForm({ ...form, fantasia: e.target.value })}
                        />

                        <label>CEP:</label>
                        <input
                            type="text"
                            value={form.cep}
                            onChange={e => setForm({ ...form, cep: e.target.value })}
                        />

                        <label>Logradouro:</label>
                        <input
                            type="text"
                            value={form.logradouro}
                            onChange={e => setForm({ ...form, logradouro: e.target.value })}
                        />

                        <label>Número: </label>
                        <input
                            type="text"
                            value={form.numero}
                            onChange={e => setForm({ ...form, numero: e.target.value })}
                        />

                        <label>Bairro:</label>
                        <input
                            type="text"
                            value={form.bairro}
                            onChange={e => setForm({ ...form, bairro: e.target.value })}
                        />

                        <label>Cidade:</label>
                        <input
                            type="text"
                            value={form.municipio}
                            onChange={e => setForm({ ...form, municipio: e.target.value })}
                        />

                        <label>UF:</label>
                        <input
                            type="text"
                            value={form.uf}
                            onChange={e => setForm({ ...form, uf: e.target.value })}
                        />

                        <div className="modal-actions">
                            <button className="btn" onClick={salvar}>Salvar</button>
                            <button className="btn-cancel" onClick={() => setModalAberto(false)}>Cancelar</button>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
}
