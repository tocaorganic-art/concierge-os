// Dados oficiais da empresa e formas de pagamento aceitas.
// Fonte: Certificado de Inova Simples (emitido em 19/08/2026) + QR Code / chave Pix
// fornecidos por Tony em 26/09/2026. Não alterar sem confirmação — estes dados
// aparecem para os clientes finais no Portal do Cliente.

export const COMPANY_INFO = {
  nomeEmpresarial: "TOCA EXPERIENCE INOVA SIMPLES (I.S.)",
  cnpjFormatado: "68.662.845/0001-86",
  cnpjNumerico: "68662845000186",
  situacaoCadastral: "ATIVA",
  dataAbertura: "19/08/2026",
  atividadePrincipal:
    "Atividades de intermediação e agenciamento de serviços e negócios em geral, exceto imobiliários (CNAE 7490-1/04)",
  endereco: {
    logradouro: "Rua Alameda Bom Jesus, 7 (antiga Rua Monteiro Lobato)",
    bairro: "Trancoso",
    municipio: "Porto Seguro",
    uf: "BA",
    cep: "46098-000",
  },
};

// Duas formas de pagamento aceitas para cobranças de "Contas a Pagar".
// O payload do QR Code foi extraído (decodificado) e validado por CRC16 a partir
// da imagem original enviada por Tony — é o mesmo QR, só renderizado via componente
// em vez de imagem estática, para ficar nítido em qualquer tamanho de tela.
export const PIX_PAYMENT_METHODS = {
  qrCode: {
    // Chave aleatória (EVP) usada neste QR — diferente da chave CNPJ abaixo.
    // São duas formas independentes de pagamento, não a mesma chave em formatos diferentes.
    payload:
      "00020126580014br.gov.bcb.pix013624fb48a3-89fe-458f-818f-c85382f3407d5204000053039865802BR5925TOCA EXPERIENCE INOVA SIM6012PORTO SEGURO622605223SRns8KymPZ4mz2NaJ2YkM63047844",
  },
  chavePix: {
    tipo: "CNPJ",
    valor: "68662845000186",
    valorFormatado: "68.662.845/0001-86",
  },
};
