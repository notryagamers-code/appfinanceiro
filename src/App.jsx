import { BrowserRouter, Routes, Route } from "react-router-dom";
import TopMenu from "./components/TopMenu";

import Remuneracoes from "./pages/Remuneracoes";
import Pagamentos from "./pages/Pagamentos";
import Fechamentos from "./pages/Fechamentos";
import Fornecedores from "./pages/Fornecedores";
import Movimentacoes from "./pages/movimentacoes";

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-container">

        <TopMenu />

        <div className="content-wrapper">
          <Routes>
            <Route path="/" element={<Remuneracoes />} />
            <Route path="/pagamentos" element={<Pagamentos />} />
            <Route path="/fechamentos" element={<Fechamentos />} />
            <Route path="/fornecedores" element={<Fornecedores />} />
            <Route path="/movimentacoes" element={<Movimentacoes />} />
          </Routes>
        </div>

      </div>
    </BrowserRouter>
  );
}
