import { NavLink } from "react-router-dom";

export default function TopMenu() {
    return (
        <header className="top-menu">
            <nav className="top-nav">
                <NavLink to="/" className="menu-item">Dashboard</NavLink>
                <NavLink to="/fornecedores" className="menu-item">Fornecedores</NavLink>
                <NavLink to="/movimentacoes" className="menu-item">Movimentações</NavLink>
            </nav>
        </header>
    );
}
