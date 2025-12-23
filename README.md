# TaskFlow Pro 🚀

**TaskFlow Pro** é uma interface de gerenciamento de pedidos e fluxo de trabalho (kanban) construída com HTML, CSS e JavaScript puro, pensada para estúdios e designers que precisam controlar pedidos, clientes, serviços, agenda e emissão de recibos de forma simples e leve.

---

## ✨ Funcionalidades principais

- **Dashboard**: indicadores como lucro estimado, pedidos em progresso, pedidos concluídos no mês e número de clientes.
- **Kanban**: quadro com colunas "A Fazer", "Em Progresso", "Revisão/Aprovação" e "Concluído" com suporte a arrastar e soltar.
- **Cadastro de Pedidos**: formulário para criar pedidos com seleção de cliente, inclusão de múltiplos serviços, quantidade, prazo, prioridade e descrição.
- **Cadastro de Clientes**: adicionar, listar e remover clientes.
- **Cadastro de Serviços**: adicionar, listar e remover serviços com valor estimado.
- **Agenda/Calendário**: visão mensal com as entregas agendadas e destaque de tarefas próximas ou vencidas.
- **Notificações e Alertas**: sininho com contador e alertas visíveis para prazos urgentes e próximos.
- **Modal de edição**: editar status, prioridade, data e descrição de um pedido, emitir recibo e excluir pedido.
- **Recibos inteligentes**: gerar recibos com subtotais, desconto em porcentagem e versão para cliente/empresa com opção de impressão/PDF.
- **Persistência local**: todos os dados são armazenados em `localStorage` (clientes, serviços e pedidos).
- **Tema claro/escuro e sidebar retrátil**: alternância de tema e colapso da barra lateral, com estado salvo em `localStorage`.

---

## 🧰 Tecnologias

- HTML5
- CSS3 (variáveis de tema e responsividade)
- JavaScript (Vanilla)
- Font Awesome (ícones)
- Armazenamento: `localStorage`

---

## 📁 Estrutura do projeto

- `index.html` — página principal
- `css/style.css` — estilos do layout, temas e componentes
- `js/script.js` — toda a lógica da aplicação (cadastros, kanban, calendário, notificações, recibos)

---

## ▶️ Como usar (local)

1. Abra a pasta do projeto no seu editor ou gerenciador de arquivos.
2. Abra `index.html` no navegador (duplo clique ou `Open with Live Server`).
3. Comece adicionando **Serviços** e **Clientes** antes de criar Pedidos.
4. Utiliza o Kanban para acompanhar o andamento, arrastando os cards entre colunas.

> Observação: como os dados ficam no `localStorage` do navegador, limpar o cache ou usar outro navegador irá reiniciar os dados.

---

## 💡 Boas práticas e dicas

- Use títulos curtos nos pedidos para evitar quebras visualmente longas (o layout já lida com quebra de linha, mas é recomendável manter clareza).
- Ao concluir um pedido, você pode aplicar um desconto percentual pelo modal de edição antes de emitir o recibo.
- Para testes rápidos, crie alguns serviços com valores e depois gere pedidos com data de entrega próximas para ver os alertas em ação.