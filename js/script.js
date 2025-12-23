// ==================================================
// == ESTRUTURA DE DADOS E VARIÁVEIS ================
// ==================================================
let clientes = JSON.parse(localStorage.getItem('clientes')) || [];
let servicos = JSON.parse(localStorage.getItem('servicos')) || [];
let pedidos = JSON.parse(localStorage.getItem('pedidos')) || [];
let idContadorPedido = pedidos.length > 0 ? Math.max(...pedidos.map(p => p.id)) + 1 : 1;
let mesAtual = new Date();
mesAtual.setDate(1);
mesAtual.setHours(0, 0, 0, 0);

const DIAS_URGENTE = 3; 
const DIAS_ALERTA_SININHO = 7; 
let pedidoSendoEditado = null;

// ==================================================
// == FUNÇÕES GLOBAIS E SALVAMENTO ==================
// ==================================================

function salvarDados() {
    localStorage.setItem('clientes', JSON.stringify(clientes));
    localStorage.setItem('servicos', JSON.stringify(servicos));
    localStorage.setItem('pedidos', JSON.stringify(pedidos));
    verificarAlertasPrazo();
    renderizarDashboard();
}

function mostrarSecao(secao) {
    document.querySelectorAll('.secao').forEach(s => s.classList.remove('ativa'));
    const secaoAlvo = document.getElementById(`secao-${secao}`);
    if (secaoAlvo) secaoAlvo.classList.add('ativa');

    document.querySelectorAll('#sidebar nav button').forEach(btn => btn.classList.remove('ativo'));
    const btnAtivo = document.querySelector(`#sidebar nav button[data-secao="${secao}"]`);
    if (btnAtivo) btnAtivo.classList.add('ativo');

    if (secao === 'dashboard') renderizarDashboard();
    else if (secao === 'kanban') renderizarKanban();
    else if (secao === 'novo-pedido') {
        popularSelectsPedido();
        const container = document.getElementById('servicos-do-pedido-container');
        if (container && (container.children.length === 0 || container.querySelector('select').innerHTML.trim() === "")) {
            container.innerHTML = criarServicoInputHTML();
        }
    }
    else if (secao === 'clientes') renderizarListaClientes();
    else if (secao === 'servicos') renderizarListaServicos();
    else if (secao === 'agenda') renderizarCalendario();
    else if (secao === 'historico') renderizarHistorico();
}

// ==================================================
// == DASHBOARD =====================================
// ==================================================

function calcularTotalPedido(p) {
    let total = 0;
    if (p.servicos) {
        p.servicos.forEach(item => {
            const s = servicos.find(serv => serv.id == item.servicoId);
            if (s) total += parseFloat(s.valor) * item.quantidade;
        });
    }
    return total;
}

function renderizarDashboard() {
    let lucroTotal = 0;
    pedidos.forEach(p => {
        const subtotal = calcularTotalPedido(p);
        const desc = p.descontoFixo || 0;
        lucroTotal += (subtotal - (subtotal * desc / 100));
    });

    const lucroElement = document.getElementById('indicador-lucro-total');
    if (lucroElement) lucroElement.textContent = lucroTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const progressoElement = document.getElementById('indicador-em-progresso');
    if (progressoElement) progressoElement.textContent = pedidos.filter(p => p.status === 'em-progresso' || p.status === 'revisao').length;

    const agora = new Date();
    const concluidosMes = pedidos.filter(p => {
        if (p.status !== 'concluido' || !p.dataConclusao) return false;
        const dataC = new Date(p.dataConclusao + 'T12:00:00');
        return dataC.getFullYear() === agora.getFullYear() && dataC.getMonth() === agora.getMonth();
    }).length;

    if (document.getElementById('indicador-concluidos-mes')) document.getElementById('indicador-concluidos-mes').textContent = concluidosMes;
    if (document.getElementById('indicador-clientes')) document.getElementById('indicador-clientes').textContent = clientes.length;
}

// ==================================================
// == GESTÃO DE SERVIÇOS ============================
// ==================================================

const inputValor = document.getElementById('servico-valor');
if (inputValor) {
    inputValor.addEventListener('input', function(e) {
        // Remove tudo o que não for dígito
        let value = e.target.value.replace(/\D/g, '');
        
        if (value.length === 0) { 
            e.target.value = ''; 
            return; 
        }

        // Converte para número para remover zeros à esquerda automaticamente
        // e depois volta para string para aplicar a máscara
        value = (parseInt(value, 10)).toString();

        // Garante que tenha pelo menos 3 dígitos para formatar os centavos
        while (value.length < 3) { 
            value = '0' + value; 
        }

        const integerPart = value.slice(0, -2);
        const decimalPart = value.slice(-2);
        
        // Aplica o ponto de milhar e a vírgula decimal
        e.target.value = `${integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${decimalPart}`;
    });
}

const formServico = document.getElementById('form-servico');
if (formServico) {
    formServico.addEventListener('submit', function(e) {
        e.preventDefault();
        let valorFloat = document.getElementById('servico-valor').value.replace(/\./g, '').replace(',', '.');
        servicos.push({
            id: Date.now(),
            nome: document.getElementById('servico-nome').value,
            valor: parseFloat(valorFloat).toFixed(2),
            descricao: document.getElementById('servico-descricao').value
        });
        salvarDados();
        renderizarListaServicos();
        this.reset();
    });
}

function renderizarListaServicos() {
    const listaDiv = document.getElementById('lista-servicos');
    if (!listaDiv) return;
    if (servicos.length === 0) { listaDiv.innerHTML = '<p>Nenhum serviço cadastrado.</p>'; return; }
    let html = `<table class="tabela-dados"><thead><tr><th>Nome</th><th>Valor</th><th>Ações</th></tr></thead><tbody>`;
    servicos.forEach(s => {
        html += `<tr><td>${s.nome}</td><td>${parseFloat(s.valor).toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</td>
        <td><button class="btn-excluir" onclick="excluirServico(${s.id})"><i class="fas fa-trash"></i></button></td></tr>`;
    });
    listaDiv.innerHTML = html + '</tbody></table>';
}

function excluirServico(id) {
    if (confirm('Excluir este serviço?')) {
        servicos = servicos.filter(s => s.id !== id);
        salvarDados();
        renderizarListaServicos();
    }
}

// ==================================================
// == PEDIDOS E FORMULÁRIO ==========================
// ==================================================

function criarServicoInputHTML(servicoId = '', quantidade = 1) {
    const options = servicos.map(s => `<option value="${s.id}" ${s.id == servicoId ? 'selected' : ''}>${s.nome}</option>`).join('');
    return `
        <div class="servico-item" style="display: grid; grid-template-columns: 3fr 1fr 50px; gap: 10px; margin-bottom: 10px;">
            <select class="pedido-servico-select" required>
                <option value="">Selecione o serviço...</option>
                ${options}
            </select>
            <input type="number" min="1" value="${quantidade}" class="pedido-servico-quantidade" required>
            <button type="button" class="btn-remover-servico" onclick="removerServico(this)"><i class="fas fa-times"></i></button>
        </div>`;
}

function popularSelectsPedido() {
    const select = document.getElementById('pedido-cliente');
    if (!select) return;
    const currentVal = select.value;
    select.innerHTML = '<option value="">Selecione um Cliente</option>';
    clientes.forEach(c => select.appendChild(new Option(c.nome, c.id)));
    select.value = currentVal;
}

function adicionarNovoServicoInput() {
    const container = document.getElementById('servicos-do-pedido-container');
    const div = document.createElement('div');
    div.innerHTML = criarServicoInputHTML();
    container.appendChild(div.firstElementChild);
}

function removerServico(btn) {
    if (document.querySelectorAll('.servico-item').length > 1) {
        btn.closest('.servico-item').remove();
    }
}

const formPedido = document.getElementById('form-pedido');
if (formPedido) {
    formPedido.addEventListener('submit', function(e) {
        e.preventDefault();
        const servicosPedido = [];
        document.querySelectorAll('.servico-item').forEach(item => {
            servicosPedido.push({
                servicoId: item.querySelector('.pedido-servico-select').value,
                quantidade: parseInt(item.querySelector('.pedido-servico-quantidade').value)
            });
        });

        const novo = {
            id: idContadorPedido++,
            clienteId: document.getElementById('pedido-cliente').value,
            servicos: servicosPedido,
            titulo: document.getElementById('pedido-titulo').value,
            dataEntrega: document.getElementById('pedido-data-entrega').value,
            prioridade: document.getElementById('pedido-prioridade').value,
            descricao: document.getElementById('pedido-descricao').value,
            status: 'a-fazer',
            descontoFixo: null, 
            dataCadastro: new Date().toISOString().split('T')[0]
        };
        pedidos.push(novo);
        salvarDados();
        this.reset();
        document.getElementById('servicos-do-pedido-container').innerHTML = criarServicoInputHTML();
        mostrarSecao('kanban');
    });
}

// ==================================================
// == KANBAN E MODAL ================================
// ==================================================

function renderizarKanban() {
    document.querySelectorAll('.kanban-cards').forEach(col => col.innerHTML = '');
    pedidos.filter(p => p.status !== 'concluido').forEach(p => {
        const col = document.getElementById(`coluna-${p.status}`);
        if (col) col.appendChild(criarCard(p));
    });
}

function criarCard(p) {
    const card = document.createElement('div');
    card.className = `kanban-card prioridade-${p.prioridade}`;
    card.setAttribute('draggable', true);
    card.dataset.id = p.id;
    const cli = clientes.find(c => c.id == p.clienteId);
    
    card.innerHTML = `
        <div class="card-titulo">#${p.id} - ${p.titulo}</div>
        <div class="card-detalhe"><strong>Cliente:</strong> ${cli ? cli.nome : 'N/A'}</div>
        <div class="card-detalhe"><strong>Entrega:</strong> ${p.dataEntrega.split('-').reverse().join('/')}</div>
    `;
    card.addEventListener('dragstart', e => { idSendoArrastado = p.id; card.classList.add('arrastando'); });
    card.addEventListener('dragend', () => card.classList.remove('arrastando'));
    card.addEventListener('click', () => abrirModal(p));
    return card;
}

let idSendoArrastado = null;
function dragOver(e) { e.preventDefault(); e.currentTarget.classList.add('dragover'); }
function dragLeave(e) { e.currentTarget.classList.remove('dragover'); }

function drop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    const novoStatus = e.currentTarget.dataset.status;
    const p = pedidos.find(pedido => pedido.id == idSendoArrastado);
    
    if (p) {
        const statusAnterior = p.status;
        p.status = novoStatus;
        if (novoStatus === 'concluido' && statusAnterior !== 'concluido') {
            p.dataConclusao = new Date().toISOString().split('T')[0];
            solicitarDesconto(p); 
        }
        salvarDados();
        renderizarCalendario();
        renderizarKanban();
    }
}

function solicitarDesconto(p) {
    const subtotal = calcularTotalPedido(p);
    const msg = `PEDIDO CONCLUÍDO!\nSubtotal: ${subtotal.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}\n\nDeseja aplicar um desconto (%) agora?\n(Deixe em branco para adiar ou digite 0 para nenhum)`;
    const desc = prompt(msg);
    
    if (desc !== null && desc.trim() !== "") {
        p.descontoFixo = parseFloat(desc);
        salvarDados();
    }
}

function abrirModal(p) {
    pedidoSendoEditado = p;
    document.getElementById('modal-titulo').textContent = `Pedido #${p.id}`;
    document.getElementById('modal-body').innerHTML = `
        <form id="form-edicao">
            <label>Status</label>
            <select id="edit-status">
                <option value="a-fazer" ${p.status==='a-fazer'?'selected':''}>A Fazer</option>
                <option value="em-progresso" ${p.status==='em-progresso'?'selected':''}>Em Progresso</option>
                <option value="revisao" ${p.status==='revisao'?'selected':''}>Revisão</option>
                <option value="concluido" ${p.status==='concluido'?'selected':''}>Concluído</option>
            </select>
            <label>Prioridade</label>
            <select id="edit-prioridade">
                <option value="baixa" ${p.prioridade==='baixa'?'selected':''}>Baixa</option>
                <option value="media" ${p.prioridade==='media'?'selected':''}>Média</option>
                <option value="alta" ${p.prioridade==='alta'?'selected':''}>Alta</option>
            </select>
            <label>Data Entrega</label>
            <input type="date" id="edit-data" value="${p.dataEntrega}">
            <label>Descrição/Briefing</label>
            <textarea id="edit-desc" rows="4">${p.descricao || ''}</textarea>
            
            <div style="display:flex; flex-direction: column; gap:10px; margin-top:15px;">
                <button type="submit" style="background: var(--cor-primaria); color:white; border:none; padding:12px; border-radius:4px; cursor:pointer; font-weight:bold;">Salvar Alterações</button>
                <button type="button" onclick="gerarRecibo(${p.id})" style="background: #2ecc71; color:white; border:none; padding:12px; border-radius:4px; cursor:pointer; font-weight:bold;">Emitir Recibo</button>
                <button type="button" onclick="excluirPedidoModal()" style="background: #c0392b; color:white; border:none; padding:10px; border-radius:4px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;">
                    <i class="fas fa-trash"></i> Excluir Pedido
                </button>
            </div>
        </form>`;
    
    document.getElementById('form-edicao').onsubmit = (e) => {
        e.preventDefault();
        const novoStatus = document.getElementById('edit-status').value;
        const mudouParaConcluido = (p.status !== 'concluido' && novoStatus === 'concluido');
        
        p.status = novoStatus;
        p.prioridade = document.getElementById('edit-prioridade').value;
        p.dataEntrega = document.getElementById('edit-data').value;
        p.descricao = document.getElementById('edit-desc').value;
        
        if (mudouParaConcluido) {
            p.dataConclusao = new Date().toISOString().split('T')[0];
            fecharModal();
            solicitarDesconto(p);
        } else {
            fecharModal();
        }
        salvarDados();
        renderizarKanban();
    };
    document.getElementById('modal-overlay').style.display = 'flex';
}

function fecharModal() {
    document.getElementById('modal-overlay').style.display = 'none';
    pedidoSendoEditado = null;
}

function excluirPedidoModal() {
    if (pedidoSendoEditado && confirm('Deseja realmente apagar este pedido?')) {
        pedidos = pedidos.filter(p => p.id !== pedidoSendoEditado.id);
        salvarDados();
        fecharModal();
        renderizarKanban();
    }
}

// ==================================================
// ============== HISTÓRICO E RECIBOS ===============
// ==================================================

function renderizarHistorico() {
    const lista = document.getElementById('lista-historico');
    if(!lista) return;
    const concluidos = pedidos.filter(p => p.status === 'concluido');
    
    const histTotal = document.getElementById('hist-total');
    if(histTotal) histTotal.textContent = concluidos.length;

    let totalFat = concluidos.reduce((acc, p) => {
        const sub = calcularTotalPedido(p);
        const desc = p.descontoFixo || 0;
        return acc + (sub - (sub * desc / 100));
    }, 0);

    const histFat = document.getElementById('hist-faturamento');
    if(histFat) histFat.textContent = totalFat.toLocaleString('pt-BR', {style:'currency', currency:'BRL'});

    if (concluidos.length === 0) {
        lista.innerHTML = "<p style='padding:20px;'>Nenhum pedido concluído no histórico.</p>";
        return;
    }

    let html = `<table class="tabela-dados"><thead><tr><th>ID</th><th>Título</th><th>Cliente</th><th>Conclusão</th><th>Final</th><th>Ações</th></tr></thead><tbody>`;
    concluidos.slice().reverse().forEach(p => {
        const cli = clientes.find(c => c.id == p.clienteId);
        const sub = calcularTotalPedido(p);
        const total = sub - (sub * (p.descontoFixo || 0) / 100);
        
        html += `<tr>
            <td>#${p.id}</td>
            <td>${p.titulo}</td>
            <td>${cli ? cli.nome : 'N/A'}</td>
            <td>${p.dataConclusao.split('-').reverse().join('/')}</td>
            <td>${total.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</td>
            <td style="display: flex; gap: 5px;">
                <button class="btn-excluir" style="background:#3498db" title="Recibo" onclick="gerarRecibo(${p.id})"><i class="fas fa-file-invoice"></i></button>
                <button class="btn-excluir" title="Excluir" onclick="excluirPedidoGeral(${p.id})"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`;
    });
    lista.innerHTML = html + '</tbody></table>';
}

function excluirPedidoGeral(id) {
    if (confirm('Deseja excluir permanentemente este pedido do histórico?')) {
        pedidos = pedidos.filter(p => p.id !== id);
        salvarDados();
        renderizarHistorico();
    }
}

function gerarRecibo(id) {
    const p = pedidos.find(p => p.id == id);
    const cli = clientes.find(c => c.id == p.clienteId);
    const subtotal = calcularTotalPedido(p);
    
    if (p.descontoFixo === null) {
        let descInput = prompt(`O desconto deste pedido ainda não foi definido.\nSubtotal: ${subtotal.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}\n\nQual a porcentagem de desconto?`, "0");
        if (descInput !== null) {
            p.descontoFixo = parseFloat(descInput) || 0;
            salvarDados();
        } else {
            return; 
        }
    }

    let porcentagemDesconto = p.descontoFixo;
    let valorDesconto = (subtotal * porcentagemDesconto) / 100;
    let totalFinal = subtotal - valorDesconto;

    let itensHtml = "";
    p.servicos.forEach(item => {
        const s = servicos.find(serv => serv.id == item.servicoId);
        if (s) {
            itensHtml += `<tr><td>${s.nome}</td><td>${item.quantidade}</td><td>R$ ${s.valor}</td><td>R$ ${(s.valor * item.quantidade).toFixed(2)}</td></tr>`;
        }
    });

    const conteudoRecibo = (via) => `
        <div class="via-container">
            <div class="topo">
                <div>
                    <h1 style="margin:0; color: #2c3e50;">TaskFlow Pro</h1>
                    <p style="margin:5px 0; font-weight: bold; color: #7f8c8d;">
                        VIA ${via.toLowerCase() === 'empresa' ? 'DA' : 'DO'} ${via.toUpperCase()}
                    </p>
                </div>
                <div style="text-align:right">
                    <p><strong>Recibo #${p.id}</strong></p>
                    <p>Emissão: ${new Date().toLocaleDateString('pt-BR')}</p>
                </div>
            </div>
            
            <div style="background:#f8f9fa; padding:15px; border-radius:5px; margin-bottom:20px; border: 1px solid #eee; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <p><strong>EMPRESA RESPONSÁVEL: </strong>Matheus Designer</p>
                <p><strong>CNPJ: </strong>XXXX.XXX.XXX.XXX-X</p>
            </div>

            <div style="background:#f8f9fa; padding:15px; border-radius:5px; margin-bottom:20px; border: 1px solid #eee; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div>
                    <p style="margin: 10px 0;"><strong>CLIENTE:</strong> ${cli ? cli.nome : 'N/A'}</p>
                    <p style="margin: 10px 0;"><strong>EMPRESA:</strong> ${cli && cli.empresa ? cli.empresa : '-'}</p>
                </div>
                <div>
                    <p style="margin: 10px 0;"><strong>E-MAIL:</strong> ${cli ? cli.email : '-'}</p>
                    <p style="margin: 10px 0;"><strong>TELEFONE:</strong> ${cli && cli.telefone ? cli.telefone : '-'}</p>
                </div>
            </div>


            <table>
                <thead>
                    <tr>
                        <th>Descrição do Serviço</th>
                        <th>Qtd</th>
                        <th>Unitário</th>
                        <th>Subtotal</th>
                    </tr>
                </thead>
                <tbody>${itensHtml}</tbody>
            </table>
            
            <div class="financeiro-container" style="display: flex; flex-direction: column; align-items: flex-end; margin-top: 15px;">
                <div style="font-size: 0.9em; color: #666;">
                    Subtotal: ${subtotal.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}
                </div>
                ${porcentagemDesconto > 0 ? `
                    <div style="font-size: 0.9em; color: #e74c3c;">
                        Desconto (${porcentagemDesconto}%): - ${valorDesconto.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}
                    </div>` : ''}
                <div class="total" style="margin-top: 5px; font-size: 1.3em; font-weight: bold;">
                    TOTAL: ${totalFinal.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}
                </div>
            </div>

            <div style="margin-top:40px; text-align:center">
                <p>___________________________________________________</p>
                <p>Assinatura</p>
            </div>
        </div>
    `;

    const janelaRecibo = window.open('', '', 'width=800,height=900');
    janelaRecibo.document.write(`
        <html>
        <head>
            <title>Recibo #${p.id}</title>
            <style>
                body { font-family: sans-serif; padding: 20px; color: #333; margin: 0; }
                .via-container { padding: 20px; position: relative; }
                .topo { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 13px; }
                th { background-color: #f8f9fa; }
                .linha-corte { border-top: 2px dashed #aaa; margin: 30px 0; position: relative; text-align: center; }
                .linha-corte:after { content: '✂ Corte aqui'; position: absolute; top: -12px; left: 50%; background: white; padding: 0 10px; color: #aaa; font-size: 12px; }
                .btn-print { padding: 12px 30px; background: #2c3e50; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; }
                @media print { .btn-print-container { display: none; } body { padding: 0; } }
            </style>
        </head>
        <body>
            <div class="btn-print-container" style="text-align:center; padding: 10px;">
                <button class="btn-print" onclick="window.print()">IMPRIMIR / SALVAR PDF</button>
            </div>
            ${conteudoRecibo('Cliente')}
            <div class="linha-corte"></div>
            ${conteudoRecibo('Empresa')}
        </body>
        </html>
    `);
}

// ==================================================
// == AGENDA E ALERTAS ==============================
// ==================================================

function renderizarCalendario() {
    const grid = document.getElementById('calendario-view');
    if (!grid) return;
    
    // Limpa apenas os dias (mantém o cabeçalho de dias da semana se houver)
    while (grid.children.length > 7) grid.lastChild.remove();

    const ano = mesAtual.getFullYear();
    const mes = mesAtual.getMonth();
    
    const hoje = new Date();
    const diaHoje = hoje.getDate();
    const mesHoje = hoje.getMonth();
    const anoHoje = hoje.getFullYear();

    const tituloElement = document.getElementById('mes-ano-titulo');
    if(tituloElement) {
        tituloElement.textContent = new Date(ano, mes).toLocaleDateString('pt-BR', {month:'long', year:'numeric'});
    }

    const primeiroDia = new Date(ano, mes, 1).getDay();
    const ultimoDia = new Date(ano, mes + 1, 0).getDate();

    // Espaços vazios para os dias antes do início do mês
    for (let i = 0; i < primeiroDia; i++) grid.appendChild(document.createElement('div'));

    for (let dia = 1; dia <= ultimoDia; dia++) {
        const celula = document.createElement('div');
        celula.className = 'dia-celula';
        
        // Destaca o dia de hoje
        if (dia === diaHoje && mes === mesHoje && ano === anoHoje) {
            celula.classList.add('hoje');
        }

        const dataStr = `${ano}-${String(mes+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
        celula.innerHTML = `<strong>${dia}</strong>`;
        
        // Filtra pedidos não concluídos para este dia específico
        const doDia = pedidos.filter(p => p.dataEntrega === dataStr && p.status !== 'concluido');
        
        doDia.forEach(p => {
            const span = document.createElement('span');
            // Aplica classe base e a classe de cor baseada na prioridade
            span.className = `tarefa-dia prioridade-${p.prioridade}`; 
            span.textContent = p.titulo;
            
            span.onclick = (e) => {
                e.stopPropagation();
                abrirModal(p); // Abre o modal para edição
            };
            celula.appendChild(span);
        });
        
        grid.appendChild(celula);
    }
}

function mudarMes(offset) {
    mesAtual.setMonth(mesAtual.getMonth() + offset);
    renderizarCalendario();
}

// ==================================================
// == CLIENTES ======================================
// ==================================================

const formCli = document.getElementById('form-cliente');
if (formCli) {
    formCli.addEventListener('submit', function(e) {
        e.preventDefault();
        clientes.push({
            id: Date.now(),
            nome: document.getElementById('cliente-nome').value,
            email: document.getElementById('cliente-email').value,
            telefone: document.getElementById('cliente-telefone') ? document.getElementById('cliente-telefone').value : '',
            empresa: document.getElementById('cliente-empresa').value
        });
        salvarDados();
        renderizarListaClientes();
        this.reset();
    });
}

function renderizarListaClientes() {
    const div = document.getElementById('lista-clientes');
    if (!div) return;
    if (clientes.length === 0) { div.innerHTML = '<p style="padding:20px;">Nenhum cliente cadastrado.</p>'; return; }
    let html = `<table class="tabela-dados"><thead><tr><th>Nome</th><th>Empresa</th><th>Ações</th></tr></thead><tbody>`;
    clientes.forEach(c => {
        html += `<tr><td>${c.nome}</td><td>${c.empresa || '-'}</td><td><button class="btn-excluir" onclick="excluirCliente(${c.id})"><i class="fas fa-trash"></i></button></td></tr>`;
    });
    div.innerHTML = html + '</tbody></table>';
}

function excluirCliente(id) {
    if(confirm("Excluir este cliente?")) {
        clientes = clientes.filter(c => c.id !== id);
        salvarDados();
        renderizarListaClientes();
    }
}

// ==================================================
// == NOTIFICAÇÕES ==================================
// ==================================================

function verificarAlertasPrazo() {
    const alertBar = document.getElementById('notificacoes-alerta');
    const bellBadge = document.getElementById('bell-badge');
    const hoje = new Date();
    hoje.setHours(0,0,0,0);

    let urgentes = []; 
    let proximos = []; 

    pedidos.forEach(p => {
        if (p.status === 'concluido') return;
        const entrega = new Date(p.dataEntrega + 'T12:00:00');
        const diffDays = Math.ceil((entrega - hoje) / (1000 * 60 * 60 * 24));
        if (diffDays <= DIAS_URGENTE) urgentes.push(p);
        else if (diffDays <= DIAS_ALERTA_SININHO) proximos.push(p);
    });

    if (alertBar) {
        alertBar.style.display = urgentes.length > 0 ? 'block' : 'none';
        if (urgentes.length > 0) alertBar.innerHTML = `<strong>URGENTE:</strong> ${urgentes.length} entrega(s) crítica(s)!`;
    }

    if (bellBadge) {
        const total = urgentes.length + proximos.length;
        bellBadge.textContent = total;
        bellBadge.style.display = total > 0 ? 'flex' : 'none';
    }
}

function abrirNotificacoes() {
    const hoje = new Date();
    hoje.setHours(0,0,0,0);
    const alertas = pedidos.filter(p => {
        if (p.status === 'concluido') return false;
        const entrega = new Date(p.dataEntrega + 'T12:00:00');
        const diffDays = Math.ceil((entrega - hoje) / (1000 * 60 * 60 * 24));
        return diffDays <= DIAS_ALERTA_SININHO;
    });

    document.getElementById('modal-titulo').textContent = `Alertas de Prazo`;
    let html = '<div style="max-height: 400px; overflow-y: auto;">';
    if (alertas.length === 0) {
        html += '<p style="padding: 20px; text-align: center;">Nenhum alerta para os próximos 7 dias.</p>';
    } else {
        alertas.sort((a,b) => new Date(a.dataEntrega) - new Date(b.dataEntrega)).forEach(p => {
            const entrega = new Date(p.dataEntrega + 'T12:00:00');
            const diffDays = Math.ceil((entrega - hoje) / (1000 * 60 * 60 * 24));
            const cor = diffDays <= DIAS_URGENTE ? '#e74c3c' : '#f39c12';
            html += `
                <div onclick="fecharModal(); abrirModal(${JSON.stringify(p).replace(/"/g, '&quot;')})" 
                     style="padding: 12px; border-bottom: 1px solid #eee; cursor: pointer; display: flex; align-items: center; gap: 15px;">
                    <div style="width: 12px; height: 12px; border-radius: 50%; background: ${cor}"></div>
                    <div style="flex: 1;">
                        <div style="font-weight: bold;">#${p.id} - ${p.titulo}</div>
                        <div style="font-size: 0.85em; color: #666;">Vence em ${diffDays} dia(s) (${p.dataEntrega.split('-').reverse().join('/')})</div>
                    </div>
                </div>`;
        });
    }
    document.getElementById('modal-body').innerHTML = html + '</div>';
    document.getElementById('modal-overlay').style.display = 'flex';
}

// ==================================================
// == CONTROLE DE INTERFACE (MENU E TEMA) ===========
// ==================================================

function alternarMenu() {
  document.body.classList.toggle('sidebar-expandida');

  // opcional: atualizar ícone de direção
  const btnIcon = document.querySelector('#btn-menu i');
  if (btnIcon) {
    const expandida = document.body.classList.contains('sidebar-expandida');
    btnIcon.className = expandida ? 'fas fa-arrow-left' : 'fas fa-arrow-right';
  }
}

function alternarTema() {
    const corpo = document.body;
    corpo.classList.toggle('dark-mode');
    const temaAtivo = corpo.classList.contains('dark-mode') ? 'dark' : 'light';
    localStorage.setItem('theme', temaAtivo);
    const btnTemaIcon = document.querySelector('#btn-tema i');
    if (btnTemaIcon) {
        btnTemaIcon.className = temaAtivo === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
}

// ==================================================
// == INICIALIZAÇÃO CORRIGIDA =======================
// ==================================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. Carregar Tema
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
        const btnTemaIcon = document.querySelector('#btn-tema i');
        if (btnTemaIcon) btnTemaIcon.className = 'fas fa-sun';
    }

    // 2. Menu Hambúrguer
    document.body.classList.add('sidebar-expandida');
    const btnMenu = document.getElementById('btn-menu');
    if (btnMenu) btnMenu.addEventListener('click', alternarMenu);

    // 3. Botão Tema
    const btnTema = document.getElementById('btn-tema');
    if (btnTema) btnTema.onclick = alternarTema;

    // 4. Navegação
    document.querySelectorAll('#sidebar nav button[data-secao]').forEach(botao => {
        botao.onclick = () => mostrarSecao(botao.getAttribute('data-secao'));
    });

    // 5. Kanban Drag/Drop
    document.querySelectorAll('.kanban-coluna').forEach(col => {
        col.addEventListener('dragover', dragOver);
        col.addEventListener('dragleave', dragLeave);
        col.addEventListener('drop', drop);
    });

    // 6. Notificações
    const btnBell = document.getElementById('btn-notificacoes');
    if (btnBell) btnBell.onclick = abrirNotificacoes;

    // 7. Inicializar Formulários e Tela
    popularSelectsPedido();
    const container = document.getElementById('servicos-do-pedido-container');
    if (container) container.innerHTML = criarServicoInputHTML();
    
    mostrarSecao('dashboard');
    verificarAlertasPrazo();
});