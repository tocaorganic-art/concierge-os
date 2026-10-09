import React from "react";
import { useNavigate } from "react-router-dom";

// Cada item do menu do site institucional (public/institucional/index.html)
// agora tem sua propria rota real (/Sobre, /Curadoria, etc. — ver App.jsx).
// O conteudo continua sendo o mesmo documento estatico de sempre (um unico
// HTML com CSS/JS compartilhados entre as 8 secoes); o que muda e que ele e
// aberto dentro de um iframe de tela cheia, com "?page=<indice>" indicando
// qual secao abrir, enquanto a URL visivel no navegador fica na rota real
// (nunca em /institucional/index.html). Isso preserva 100% do carrossel
// (goTo, idiomas, tema, player do Spotify) sem duplicar nenhuma marcacao.
//
// Cliques no menu DENTRO do iframe (mesma origem) chamam
// window.parent.__institucionalNavigate(slug), que aqui delega pro
// useNavigate() do React Router — assim o historico/URL do navegador fica
// sob controle de uma unica fonte de verdade (o Router), em vez de um
// history.pushState cru feito de dentro do iframe.
export default function InstitucionalSection({ pageIndex, title }) {
  const navigate = useNavigate();

  React.useEffect(() => {
    window.__institucionalNavigate = (path) => navigate(path);
    return () => {
      delete window.__institucionalNavigate;
    };
  }, [navigate]);

  React.useEffect(() => {
    document.title = title;
  }, [title]);

  return (
    <iframe
      key={pageIndex}
      src={`/institucional/index.html?page=${pageIndex}`}
      title={title}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        border: "0",
        display: "block",
      }}
    />
  );
}
