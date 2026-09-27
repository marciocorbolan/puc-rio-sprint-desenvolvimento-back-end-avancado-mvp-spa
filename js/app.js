/***************************************************************************************/
/* GERENCIAMENTO DE ESTADO GLOBAL                                                      */
/***************************************************************************************/

const AppState = {
    // Autenticação
    access_token: localStorage.getItem('access_token'),
    access_expires_in: localStorage.getItem('access_expires_in'),
    refresh_token: localStorage.getItem('refresh_token'),
    refresh_expires_in: localStorage.getItem('refresh_expires_in'),
    userId: localStorage.getItem('user_id'),
    
    // Contexto atual
    rodadaAtual: 0,
    totalRodadas: 0,
    
    // Paginação
    currentPage: 1,
    perPage: 6,
    isLoading: false,
    hasMore: true,

    // Modo de visualização
    exibirTodos: false,

    resetPagination() {
        this.currentPage = 1;
        this.hasMore = true;
        this.isLoading = false;
    },

    startLoading(message = "Carregando...") {
        this.isLoading = true;
        const overlay = document.getElementById('global-loading');
        if (overlay) {
            overlay.querySelector('p').textContent = message;
            overlay.classList.remove('d-none');
        }
        toggleGlobalUI(false);
    },

    stopLoading() {
        this.isLoading = false;
        document.getElementById('global-loading')?.classList.add('d-none');
        toggleGlobalUI(true);
    }
};

// Atualiza access_token quando logar
function updateAuthState(access_token, access_expires_in, refresh_token, refresh_expires_in, userId) {
    AppState.access_token = access_token;
    AppState.access_expires_in = access_expires_in;
    AppState.refresh_token = refresh_token;
    AppState.refresh_expires_in = refresh_expires_in;
    AppState.userId = userId;
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('access_expires_in', access_expires_in);
    localStorage.setItem('refresh_token', refresh_token);
    localStorage.setItem('refresh_expires_in', refresh_expires_in);
    if (userId) localStorage.setItem('user_id', userId);
}

// Ler parâmetros da URL
function getUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    return {
        page: urlParams.get('page') || 'home'
    };
}

/***************************************************************************************/
/* INICIALIZAÇÃO DA SPA                                                                */
/***************************************************************************************/

document.addEventListener('DOMContentLoaded', async () => {
    // Verifica se já está logado
    if (AppState.access_token) {
        atualizarNavbarLogado();
    }

    /***********************************************************************************/

    // Recupera estado ao recarregar a página
    const urlParams = getUrlParams();

    /***********************************************************************************/

    // Verifica qual página carregar logo na primeira abertura do site
    const paginaInicial = (urlParams.page || 'home');
    
    // Substitui o estado inicial vazio pelo estado da página atual
    history.replaceState({ page: paginaInicial }, "", window.location.search || `?page=${paginaInicial}`);
    navigateTo(paginaInicial, true);

    /***********************************************************************************/

    // Escuta o botão Voltar/Avançar do próprio navegador
    window.addEventListener('popstate', (e) => {
        // Se houver um estado salvo no histórico, navega para ele
        if (e.state && e.state.page) {
            navigateTo(e.state.page, true); // O 'true' aqui ativa o isPopState
        } else {
            navigateTo('home', true);   // Caso contrário, volta para a home por padrão
        }
    });

    /***********************************************************************************/

    // Configura o formulário de login
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault(); 
            await executarLogin();
        });
    }

    /***********************************************************************************/

    // Configura o formulário de cadastro
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault(); 
            await executarCadastro();
        });
    }

    /***********************************************************************************/
    
    // Configura o formulário de atualizar perfil
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await executarAtualizacaoPerfil();
        });
    }

    /***********************************************************************************/

    // Vincula a máscara em tempo real a todos os campos de CPF/CNPJ de uma só vez
    const camposComMascara = document.querySelectorAll('#login-cpfcnpj, #register-cpfcnpj');
    camposComMascara.forEach(input => {
        input.addEventListener('input', (e) => {
            e.target.value = formatarCpfCnpj(e.target.value);
        });
    });
});

/***************************************************************************************/
/* CONTROLE DE INTERFACE DE USUÁRIO (UI)                                               */
/***************************************************************************************/

function atualizarNavbarLogado() {
    const authLoggedOut = document.getElementById('auth-logged-out');
    const authLoggedIn = document.getElementById('auth-logged-in');

    if (authLoggedOut && authLoggedIn) {
        authLoggedOut.classList.add('d-none');      // Esconde os botões Login/Cadastrar
        authLoggedIn.classList.remove('d-none');    // Mostra os botões do usuário logado
    }

    AppState.exibirTodos = false;
}

/***************************************************************************************/

// Função de navegação para alternar entre seções da SPA
function navigateTo(viewId, isPopState = false) {
    const sections = ['home', 'meu-cadastro', 'campeonato'];
    sections.forEach(id => {
        const section = document.getElementById(id);
        if (section) section.style.display = 'none';
    });

    const targetSection = document.getElementById(viewId);
    if (targetSection) {
        targetSection.style.display = 'block';
    }

    /***********************************************************************************/
    
    // Proteção de rotas autenticadas
    if (viewId === 'meu-cadastro') {
        if (!localStorage.getItem('access_token')) {
            navigateTo('home');
            return;
        }
    }

    /***********************************************************************************/

    if (viewId === 'meu-cadastro') {
        carregarDadosPerfil();
    }

    /***********************************************************************************/

    if (viewId === 'campeonato') {
        carregarDadosCampeonato();
    }
}

/***************************************************************************************/
/* FLUXOS DE AUTENTICAÇÃO                                                              */
/***************************************************************************************/

async function executarLogin() {
    AppState.startLoading('Autenticando...');

    const form = document.getElementById('login-form');
    const botaoSubmit = document.querySelector('#login-form button[type="submit"]');
    const botaoSubmitTextoOriginal = (botaoSubmit ? botaoSubmit.innerHTML : "");
    
    const cpfcnpj = document.getElementById('login-cpfcnpj').value;
    const senha = document.getElementById('login-senha').value;

    // Remove a formatação (máscara) antes de enviar para o servidor
    const cpfcnpjLimpo = cpfcnpj.replace(/\D/g, "");

    // Validação básica de campos vazios
    if (!cpfcnpjLimpo || !senha) {
        exibirFeedback('login-feedback', "Por favor, preencha todos os campos.", "alert-warning");
        AppState.stopLoading();
        return;
    }

    // Validação cpfcnpj
    if ((cpfcnpjLimpo.length < 11) || (cpfcnpjLimpo.length > 14)) {
        exibirFeedback('login-feedback', "O CPF/CNPJ deve ter entre 11 e 14 dígitos.", "alert-warning");
        AppState.stopLoading();
        return;
    }

    // Desabilita o formulário e muda o texto do botão
    desativarFormulario(form);
    if (botaoSubmit) {
        botaoSubmit.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Entrando...`;
    }

    exibirFeedback('login-feedback', "Autenticando...", "alert-info");

    try {
        const response = await login(cpfcnpjLimpo, senha);

        if (response.ok) {
            exibirFeedback('login-feedback', "Login efetuado com sucesso!", "alert-success");
            atualizarNavbarLogado();
            
            setTimeout(() => {
                resetarModalFormulario('loginModal', 'login-form');
                restaurarBotao(botaoSubmit, botaoSubmitTextoOriginal);
                reativarFormulario(form);
            }, 1000);
        } else {
            let mensagemErro = "Erro ao tentar fazer login. Tente novamente mais tarde.";
            
            try {
                const errorData = await response.json();
                mensagemErro = errorData.mensagem || errorData.error || errorData.message || mensagemErro;
            } catch (e) {
                // Caso o backend não retorne um JSON válido no erro, decide por status HTTP genéricos
                if ((response.status === 401) || (response.status === 403)) {
                    mensagemErro = "CPF/CNPJ ou senha incorretos.";
                }
            }

            exibirFeedback('login-feedback', mensagemErro, "alert-danger");
            restaurarBotao(botaoSubmit, botaoSubmitTextoOriginal);
            reativarFormulario(form);
        }
    } catch (error) {
        exibirFeedback('login-feedback', "Falha ao se conectar com o servidor.", "alert-danger");
        restaurarBotao(botaoSubmit, botaoSubmitTextoOriginal);
        reativarFormulario(form);
    } finally {
        AppState.stopLoading();
    }
}

/***************************************************************************************/

async function executarCadastro() {
    AppState.startLoading("Cadastrando...");

    const form = document.getElementById('register-form');
    const botaoSubmit = document.querySelector('#register-form button[type="submit"]');
    const botaoSubmitTextoOriginal = (botaoSubmit ? botaoSubmit.innerHTML : "");

    const nome = document.getElementById('register-nome').value;
    const email = document.getElementById('register-email').value;
    const cpfcnpj = document.getElementById('register-cpfcnpj').value;
    const senha = document.getElementById('register-senha').value;

    const cpfcnpjLimpo = cpfcnpj.replace(/\D/g, "");

    // Validação básica de campos vazios
    if (!nome || !email || !cpfcnpjLimpo || !senha) {
        exibirFeedback('register-feedback', "Por favor, preencha todos os campos obrigatórios.", "alert-warning");
        AppState.stopLoading();
        return;
    }

    // Validação cpfcnpj
    if ((cpfcnpjLimpo.length < 11) || (cpfcnpjLimpo.length > 14)) {
        exibirFeedback('register-feedback', "O CPF/CNPJ deve ter entre 11 e 14 dígitos.", "alert-warning");
        AppState.stopLoading();
        return;
    }

    // Desabilita o formulário e muda o texto do botão
    desativarFormulario(form);
    if (botaoSubmit) {
        botaoSubmit.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processando...`;
    }

    exibirFeedback('register-feedback', "Cadastrando...", "alert-info");

    try {
        const response = await register(nome, email, cpfcnpjLimpo, senha);
        
        if ((response.status === 201) || response.ok) {
            exibirFeedback('register-feedback', "Cadastro criado com sucesso!", "alert-success");

            setTimeout(() => {
                resetarModalFormulario('registerModal', 'register-form');
                restaurarBotao(botaoSubmit, botaoSubmitTextoOriginal);
                reativarFormulario(form);
                
                // Abre o modal de login para facilitar o fluxo do usuário
                const loginModalElement = document.getElementById('loginModal');
                const loginModal = new bootstrap.Modal(loginModalElement);
                loginModal.show();
            }, 1000);
        } else {
            const mensagemErro = await handleApiError(response, "Erro ao realizar o cadastro.");
            exibirFeedback('register-feedback', mensagemErro, "alert-danger");
            restaurarBotao(botaoSubmit, botaoSubmitTextoOriginal);
            reativarFormulario(form);
        }
    } catch (error) {
        exibirFeedback('register-feedback', "Falha ao se conectar com o servidor.", "alert-danger");
        restaurarBotao(botaoSubmit, botaoSubmitTextoOriginal);
        reativarFormulario(form);
    } finally {
        AppState.stopLoading();
    }
}

/***************************************************************************************/
/* FLUXOS DE PERFIL                                                                    */
/***************************************************************************************/

async function carregarDadosPerfil() {
    AppState.startLoading("Carregando dados do perfil...");

    try {
        const response = await fetchUserProfile();
        if (response.ok) {
            const data = await response.json();
            const profNome = document.getElementById('profile-nome');
            const profEmail = document.getElementById('profile-email');
            
            if (profNome) profNome.value = data.nome || '';
            if (profEmail) profEmail.value = data.email || '';
        } else if (response.status === 401) {
            executarLogout();
        }
    } catch (error) {
        exibirFeedback('profile-feedback', "Falha ao se conectar com o servidor.", "alert-danger");
    } finally {
        AppState.stopLoading();
    }
}

/***************************************************************************************/

async function executarAtualizacaoPerfil() {
    AppState.startLoading("Atualizando cadastro...");

    const form = document.getElementById('profile-form');
    const botaoSubmit = document.querySelector('#profile-form button[type="submit"]');
    const botaoSubmitTextoOriginal = (botaoSubmit ? botaoSubmit.innerHTML : "");

    const nome = document.getElementById('profile-nome').value;
    const email = document.getElementById('profile-email').value;
    const senha = document.getElementById('profile-senha').value;

    // Desabilita o formulário e muda o texto do botão
    desativarFormulario(form);
    if (botaoSubmit) {
        botaoSubmit.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Salvando...`;
    }

    exibirFeedback('profile-feedback', "Atualizando cadastro...", "alert-info");

    try {
        const response = await updateUserProfile(nome, email, senha || undefined);
        
        if (response.ok) {
            exibirFeedback('profile-feedback', "Cadastro atualizado com sucesso!", "alert-success");

            // Limpa o campo de senha por segurança
            const profSenha = document.getElementById('profile-senha');
            if (profSenha) profSenha.value = '';

            setTimeout(() => {
                restaurarBotao(botaoSubmit, botaoSubmitTextoOriginal);
                reativarFormulario(form);
            }, 1200);
        } else {
            const mensagemErro = await handleApiError(response, "Erro ao atualizar o perfil.");
            exibirFeedback('profile-feedback', mensagemErro, "alert-danger");
            restaurarBotao(botaoSubmit, botaoSubmitTextoOriginal);
            reativarFormulario(form);
        }
    } catch (error) {
        exibirFeedback('profile-feedback', "Falha ao se conectar com o servidor.", "alert-danger");
        restaurarBotao(botaoSubmit, botaoSubmitTextoOriginal);
        reativarFormulario(form);
    } finally {
        AppState.stopLoading();
    }
}

/***************************************************************************************/

function exibirFeedback(targetId, mensagem, classe) {
    const feedbackDiv = document.getElementById(targetId);
    if (!feedbackDiv) return;
    feedbackDiv.className = `alert ${classe}`;
    feedbackDiv.innerText = mensagem;
    feedbackDiv.style.display = 'block';
}

/***************************************************************************************/

function executarLogout() {
    // Remove o token do localStorage
    localStorage.removeItem('access_token');
    localStorage.removeItem('access_expires_in');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('refresh_expires_in');
    localStorage.removeItem('user_id');

    // Atualiza a página
    window.location.reload();
}

/***************************************************************************************/
/* FLUXOS DE CAMPEONATO                                                                     */
/***************************************************************************************/

async function carregarDadosCampeonato() {
    AppState.startLoading("Carregando campeonato...");

    try {
        // Busca informações do campeonato e da tabela em paralelo
        const [info, tabela, rodadas] = await Promise.all([
            fetchCampeonatoInfo(),
            fetchTabelaClassificacao(),
            fetchRodadas()
        ]);

        if (rodadas && rodadas.length) {
            AppState.totalRodadas = rodadas.length;
        }

        if (info) {
            document.getElementById('campeonato-nome').textContent = info.nome || "Campeonato Brasileiro 2026";
            if (info.logo) {
                const imgLogo = document.getElementById('campeonato-logo');
                imgLogo.src = info.logo;
                imgLogo.style.display = 'block';
            }
            if (info.status) {
                document.getElementById('campeonato-status').textContent = `● ${info.status.charAt(0).toUpperCase() + info.status.slice(1)}`;
            }
            if (info.rodada_atual && info.rodada_atual.rodada) {
                AppState.rodadaAtual = info.rodada_atual.rodada;
            }
        }

        renderTabelaClassificacao(tabela);
        await carregarRodada(AppState.rodadaAtual || 1);

    } catch (error) {
        console.error("Erro ao carregar dados do campeonato:", error);
    } finally {
        AppState.stopLoading();
    }
}

function renderTabelaClassificacao(tabela) {
    const tbody = document.getElementById('tabela-classificacao-body');
    const legendaContainer = document.getElementById('tabela-legenda');
    if (!tbody) return;

    tbody.innerHTML = '';
    const legendas = new Map();

    if (!tabela || tabela.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="text-center py-4 text-muted">Nenhum dado retornado.</td></tr>`;
        return;
    }

    tabela.forEach(item => {
        const time = item.time || {};
        const faixa = item.faixa_classificacao || {};
        const corFaixa = faixa.cor || 'transparent';

        if (faixa.nome && faixa.cor) {
            legendas.set(faixa.nome, faixa.cor);
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="text-center position-relative fw-bold">
                <span class="position-absolute start-0 top-0 bottom-0 ms-1 rounded-pill" style="width: 4px; background-color: ${corFaixa};"></span>
                ${item.posicao}
            </td>
            <td>
                <div class="d-flex align-items-center gap-2">
                    ${time.escudo ? `<img src="${time.escudo}" alt="${time.nome_popular}" style="width: 24px; height: 24px; object-fit: contain;">` : ''}
                    <span class="fw-semibold text-dark">${time.nome_popular || time.sigla || 'Time'}</span>
                </div>
            </td>
            <td class="text-center fw-bold text-dark">${item.pontos}</td>
            <td class="text-center text-muted">${item.jogos}</td>
            <td class="text-center text-muted">${item.vitorias}</td>
            <td class="text-center text-muted">${item.empates}</td>
            <td class="text-center text-muted">${item.derrotas}</td>
            <td class="text-center text-muted">${item.saldo_gols > 0 ? '+' + item.saldo_gols : item.saldo_gols}</td>
            <td class="text-center text-muted">${item.gols_pro}</td>
            <td class="text-center text-muted">${item.gols_contra}</td>
        `;
        tbody.appendChild(tr);
    });

    // Renderiza a legenda das zonas (Libertadores, Sul-Americana, Rebaixamento)
    if (legendaContainer) {
        legendaContainer.innerHTML = Array.from(legendas.entries()).map(([nome, cor]) => `
            <div class="d-flex align-items-center gap-1">
                <span class="rounded-circle" style="width: 10px; height: 10px; background-color: ${cor}; display: inline-block;"></span>
                <span>${nome}</span>
            </div>
        `).join('');
    }
}

async function carregarRodada(numeroRodada) {
    const container = document.getElementById('rodada-jogos-container');
    const titulo = document.getElementById('rodada-titulo');
    
    if (titulo) titulo.textContent = `RODADA ${numeroRodada}`;
    if (container) container.innerHTML = `<div class="text-center py-4"><div class="spinner-border spinner-border-sm text-secondary"></div></div>`;

    const dadosRodada = await fetchPartidasRodada(numeroRodada);

    if (!dadosRodada || !dadosRodada.partidas || dadosRodada.partidas.length === 0) {
        container.innerHTML = `<p class="text-center text-muted py-3 small">Nenhuma partida encontrada para esta rodada.</p>`;
        return;
    }

    container.innerHTML = dadosRodada.partidas.map(partida => {
        const mandante = partida.time_mandante || {};
        const visitante = partida.time_visitante || {};
        
        let dataFormatada = '';
        if (partida.data_realizacao_iso) {
            const d = new Date(partida.data_realizacao_iso);
            const dia = String(d.getDate()).padStart(2, '0');
            const mes = String(d.getMonth() + 1).padStart(2, '0');
            const hora = String(d.getHours()).padStart(2, '0');
            const min = String(d.getMinutes()).padStart(2, '0');
            dataFormatada = `${dia}/${mes} ${hora}:${min}`;
        }

        return `
            <div class="card border-0 bg-light rounded-3 p-2 text-center">
                <span class="badge bg-secondary-subtle text-secondary align-self-center mb-1 text-uppercase px-2" style="font-size: 0.65rem;">
                    ${partida.placar ? 'ENCERRADO' : 'AGENDADO'}
                </span>
                
                <div class="d-flex align-items-center justify-content-center gap-2 my-1">
                    <div class="d-flex align-items-center gap-1 justify-content-end" style="width: 40%;">
                        <span class="fw-bold small">${mandante.sigla || ''}</span>
                        ${mandante.escudo ? `<img src="${mandante.escudo}" alt="" style="width: 20px; height: 20px; object-fit: contain;">` : ''}
                    </div>

                    <span class="fw-bold small px-1">${partida.placar || 'vs'}</span>

                    <div class="d-flex align-items-center gap-1 justify-content-start" style="width: 40%;">
                        ${visitante.escudo ? `<img src="${visitante.escudo}" alt="" style="width: 20px; height: 20px; object-fit: contain;">` : ''}
                        <span class="fw-bold small">${visitante.sigla || ''}</span>
                    </div>
                </div>

                <small class="text-muted" style="font-size: 0.7rem;">${dataFormatada}</small>
            </div>
        `;
    }).join('');
}

function mudarRodada(delta) {
    const novaRodada = AppState.rodadaAtual + delta;
    if (novaRodada >= 1 && novaRodada <= AppState.totalRodadas) {
        AppState.rodadaAtual = novaRodada;
        carregarRodada(novaRodada);
    }
}

/***************************************************************************************/
/* UTILITÁRIOS PUROS                                                                   */
/***************************************************************************************/

// Função debounce para limitar a frequência de execução de uma função
function debounce(funcao, aguardarMs) {
    let temporizador;
    return function (...args) {
        clearTimeout(temporizador);
        temporizador = setTimeout(() => {
            funcao.apply(this, args);
        }, aguardarMs);
    };
}

/***************************************************************************************/

function removeQuebraLinha(str) {
    return str.replace(/(\r\n|\n|\r)/gm, "<br>");
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

function formataTextoModal(str) {
    if (!str) return '';
    return escapeHTML(removeQuebraLinha(str));
}

/***************************************************************************************/

async function handleApiError(response, defaultMessage = "Erro ao processar requisição.") {
    if (response.status === 401) {
        executarLogout();
        return "Sessão expirada. Faça login novamente.";
    }

    try {
        const errorData = await response.json();
        
        return errorData.mensagem || 
               errorData.message || 
               errorData.error || 
               errorData.detail ||
               defaultMessage;
    } catch (e) {
        if (response.status === 400) {
            return "Dados inválidos. Verifique as informações.";
        }
        return defaultMessage;
    }
}

/***************************************************************************************/

function resetarModalFormulario(modalId, formId) {
    const modalElement = document.getElementById(modalId);
    const form = document.getElementById(formId);
    
    // Fecha o modal
    if (modalElement) {
        const modalInstance = bootstrap.Modal.getInstance(modalElement);
        if (modalInstance) modalInstance.hide();
    }
    
    // Reseta o formulário
    if (form) form.reset();
    
    // Limpa feedbacks
    const feedbackId = formId.replace('-form', '-feedback');
    const feedback = document.getElementById(feedbackId);
    if (feedback) feedback.style.display = 'none';
}

/***************************************************************************************/

function restaurarBotao(botao, textoOriginal) {
    if (botao) {
        botao.disabled = false;
        botao.innerHTML = textoOriginal;
    }
}

/***************************************************************************************/

function desativarFormulario(formElement) {
    if (!formElement) return;
    
    const elementos = formElement.querySelectorAll('input, select, textarea, button');
    elementos.forEach(elemento => {
        elemento.disabled = true;
    });
}

/***************************************************************************************/

function reativarFormulario(formElement) {
    if (!formElement) return;
    
    const elementos = formElement.querySelectorAll('input, select, textarea, button');
    elementos.forEach(elemento => {
        elemento.disabled = false;
    });
}

/***************************************************************************************/

function toggleGlobalUI(enabled) {
    const buttons = document.querySelectorAll('button, .btn');
    buttons.forEach(btn => {
        if (!btn.closest('.modal')) {  // Não desabilita botões dentro de modais abertos
            btn.disabled = !enabled;
        }
    });
}

/***************************************************************************************/

function formatarCpfCnpj(value) {
    value = value.replace(/\D/g, "");

    if (value.length <= 11) {
        return value
            .replace(/(\d{3})(\d)/, "$1.$2")
            .replace(/(\d{3})(\d)/, "$1.$2")
            .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    } else {
        return value
            .replace(/^(\d{2})(\d)/, "$1.$2")
            .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
            .replace(/\.(\d{3})(\d)/, ".$1/$2")
            .replace(/(\d{4})(\d)/, "$1-$2");
    }
}

/***************************************************************************************/

function converterArquivoParaBase64(arquivo) {
    return new Promise((resolve, reject) => {
        const leitor = new FileReader();
        leitor.readAsDataURL(arquivo);
        leitor.onload = () => resolve(leitor.result);
        leitor.onerror = (erro) => reject(erro);
    });
}
