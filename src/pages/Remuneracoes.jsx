import { useState, useEffect } from "react";
import Dashboard from "../components/Dashboard";

export default function Remuneracoes() {

    const [dados, setDados] = useState([]);
    const [fornecedores, setFornecedores] = useState([]);

    useEffect(() => {

        fetch("/api/movimentacoes")
            .then(r => r.json())
            .then(setDados);

        fetch("/api/fornecedores")
            .then(r => r.json())
            .then(setFornecedores);

    }, []);

    return (
        <div className="page-box">
            <Dashboard
                dados={dados}
                fornecedores={fornecedores}
            />
        </div>
    );
}
