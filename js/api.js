const API_URL = 'http://localhost:8000';

/***************************************************************************************/
/* AUXILIARES DE REQUISIÇÃO                                                            */
/***************************************************************************************/

// Função interna para obter os headers padrões com ou sem autenticação
function getHeaders(exigeAutenticacao = false) {
    const headers = { 'Content-Type': 'application/json' };
    if (exigeAutenticacao) {
        const access_token = localStorage.getItem('access_token');
        if (access_token) {
            headers['Authorization'] = `Bearer ${access_token}`;
        }
    }
    return headers;
}

/***************************************************************************************/
/* AUTENTICAÇÃO                                                                        */
/***************************************************************************************/

async function register(nome, email, cpfcnpj, senha) {
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: getHeaders(false),
            body: JSON.stringify({ nome, email, cpfcnpj, senha })
        });

        return response;
    } catch (error) {
        console.error("Falha de rede ao tentar cadastrar usuário:", error);
        throw error;
    }
}

/***************************************************************************************/

async function login(cpfcnpj, senha) {
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: getHeaders(false),
            body: JSON.stringify({ cpfcnpj, senha })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.access_token) {
                localStorage.setItem('access_token', data.access_token);
            }

            if (data.access_expires_in) {
                localStorage.setItem('access_expires_in', data.access_expires_in);
            }

            if (data.refresh_token) {
                localStorage.setItem('refresh_token', data.refresh_token);
            }

            if (data.refresh_expires_in) {
                localStorage.setItem('refresh_expires_in', data.refresh_expires_in);
            }

            if (data.user_id) {
                localStorage.setItem('user_id', data.user_id);
            }
        }

        return response;
    } catch (error) {
        console.error("Falha de rede ao tentar fazer login:", error);
        throw error;
    }
}

/***************************************************************************************/
/* USUÁRIO / PERFIL                                                                    */
/***************************************************************************************/

async function fetchUserProfile() {
    try {
        const response = await fetch(`${API_URL}/user/profile`, {
            method: 'GET',
            headers: getHeaders(true)
        });

        return response;
    } catch (error) {
        console.error("Falha de rede ao recuperar perfil do usuário:", error);
        throw error;
    }
}

/***************************************************************************************/

async function updateUserProfile(nome, email, senha) {
    try {
        const bodyData = {};
        if (nome) bodyData.nome = nome;
        if (email) bodyData.email = email;
        if (senha) bodyData.senha = senha;

        const response = await fetch(`${API_URL}/user/profile`, {
            method: 'PUT',
            headers: getHeaders(true),
            body: JSON.stringify(bodyData)
        });

        return response;
    } catch (error) {
        console.error("Falha de rede ao atualizar perfil do usuário:", error);
        throw error;
    }
}

/***************************************************************************************/
/* CAMPEONATO                                                                          */
/***************************************************************************************/

// Obter detalhes/metadados do campeonato
async function fetchCampeonatoInfo() {
    try {
        const response = await fetch(`${API_URL}/campeonato/`, {
            method: 'GET',
            headers: getHeaders(true)
        });
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        console.error("Erro ao obter dados do campeonato:", error);
        return null;
    }
}

// Obter Tabela de Classificação
async function fetchTabelaClassificacao() {
    try {
        const response = await fetch(`${API_URL}/campeonato/tabela`, {
            method: 'GET',
            headers: getHeaders(true)
        });
        if (!response.ok) return [];
        return await response.json();
    } catch (error) {
        console.error("Erro ao obter tabela de classificação:", error);
        return [];
    }
}

// Obter Lista de Rodadas
async function fetchRodadas() {
    try {
        const response = await fetch(`${API_URL}/campeonato/rodadas`, {
            method: 'GET',
            headers: getHeaders(true)
        });
        if (!response.ok) return [];
        return await response.json();
    } catch (error) {
        console.error("Erro ao obter lista de rodadas:", error);
        return [];
    }
}

// Obter Partidas de uma Rodada Específica
async function fetchPartidasRodada(rodadaId) {
    try {
        const response = await fetch(`${API_URL}/campeonato/rodadas/${rodadaId}`, {
            method: 'GET',
            headers: getHeaders(true)
        });
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        console.error(`Erro ao obter partidas da rodada ${rodadaId}:`, error);
        return null;
    }
}