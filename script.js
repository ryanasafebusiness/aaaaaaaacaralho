// Configuração do Supabase
const SUPABASE_URL = 'https://snuhmgzqbswlgtxvpozu.supabase.co';
const SUPABASE_ANON_KEY = 'sbp_527fafd2123ab68dcd96ad4e8f378cabdaaf86b2';

// Inicializar Supabase
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Estado da aplicação
let currentUser = null;
let isAdmin = false;
let overtimeData = [];
let usersData = [];

// Configurações
const OVERTIME_RATE = 15.75; // Valor por hora extra
const LUNCH_DEDUCTION = 1; // Hora descontada pelo almoço

// Inicialização da aplicação
document.addEventListener('DOMContentLoaded', function() {
    updateTime();
    setInterval(updateTime, 1000);
    
    // Event listeners
    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    // Login form
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    // Overtime form
    document.getElementById('overtimeForm').addEventListener('submit', handleOvertimeSubmit);
    
    // Report period change
    document.getElementById('reportPeriod').addEventListener('change', generateReports);
}

// Função de login
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorElement = document.getElementById('loginError');
    
    try {
        // Buscar usuário no Supabase
        const { data: users, error } = await supabaseClient
            .from('users')
            .select('*')
            .eq('username', username)
            .eq('password', password)
            .single();
        
        if (error || !users) {
            errorElement.textContent = 'Usuário ou senha incorretos';
            return;
        }
        
        // Configurar usuário atual
        currentUser = users;
        isAdmin = users.is_admin;
        
        if (isAdmin) {
            showAdminPanel();
        } else {
            showDashboard();
        }
        
        // Limpar formulário
        document.getElementById('loginForm').reset();
        errorElement.textContent = '';
        
    } catch (error) {
        console.error('Erro no login:', error);
        errorElement.textContent = 'Erro ao fazer login. Tente novamente.';
    }
}

// Mostrar dashboard
async function showDashboard() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('dashboardScreen').classList.remove('hidden');
    document.getElementById('adminPanel').classList.add('hidden');
    
    // Atualizar informações do usuário
    document.getElementById('userInitial').textContent = currentUser.name.charAt(0).toUpperCase();
    document.getElementById('greeting').textContent = `Olá, ${currentUser.name}`;
    
    // Carregar dados do usuário
    await loadUserData();
}

// Mostrar painel administrativo
async function showAdminPanel() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('dashboardScreen').classList.add('hidden');
    document.getElementById('adminPanel').classList.remove('hidden');
    
    // Carregar dados administrativos
    await loadAdminData();
}

// Logout
function logout() {
    currentUser = null;
    isAdmin = false;
    
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('dashboardScreen').classList.add('hidden');
    document.getElementById('adminPanel').classList.add('hidden');
    
    // Fechar todos os modais
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.add('hidden');
    });
}

// Atualizar horário
function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    document.getElementById('currentTime').textContent = timeString;
}

// Carregar dados do usuário
async function loadUserData() {
    try {
        const { data: userOvertime, error } = await supabaseClient
            .from('overtime')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('date', { ascending: false });
        
        if (error) {
            console.error('Erro ao carregar dados:', error);
            return;
        }
        
        updateDashboardData(userOvertime || []);
    } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
    }
}

// Atualizar dashboard
async function updateDashboard() {
    await loadUserData();
}

// Atualizar dados do dashboard
function updateDashboardData(overtimeList) {
    const totalHours = calculateTotalHours(overtimeList);
    const totalValue = totalHours * OVERTIME_RATE;
    
    // Atualizar total de horas
    document.getElementById('totalHours').textContent = totalHours;
    
    // Atualizar progresso
    const monthlyGoal = 160; // Meta mensal
    const progressPercentage = Math.min((totalHours / monthlyGoal) * 100, 100);
    document.getElementById('progressFill').style.width = `${progressPercentage}%`;
    document.getElementById('progressPercentage').textContent = `${progressPercentage.toFixed(1)}%`;
    
    // Atualizar valores
    document.getElementById('availableBalance').textContent = formatCurrency(totalValue);
    document.getElementById('pendingBalance').textContent = formatCurrency(0); // Sempre 0 para simplicidade
    
    // Atualizar notificações
    updateNotifications(overtimeList);
}

// Calcular total de horas
function calculateTotalHours(overtimeList) {
    return overtimeList.reduce((total, overtime) => {
        let hours = calculateHoursDifference(overtime.start_time, overtime.end_time);
        if (overtime.has_lunch) {
            hours -= LUNCH_DEDUCTION;
        }
        return total + Math.max(0, hours); // Não permitir horas negativas
    }, 0);
}

// Calcular diferença de horas
function calculateHoursDifference(startTime, endTime) {
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    
    if (end < start) {
        // Se o fim é no dia seguinte
        end.setDate(end.getDate() + 1);
    }
    
    return (end - start) / (1000 * 60 * 60); // Converter para horas
}

// Formatar moeda
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

// Atualizar notificações
function updateNotifications(overtimeList) {
    const recentOvertime = overtimeList.filter(overtime => {
        const overtimeDate = new Date(overtime.date);
        const today = new Date();
        const diffTime = Math.abs(today - overtimeDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 7; // Últimos 7 dias
    });
    
    document.getElementById('notificationCount').textContent = recentOvertime.length;
}

// Mostrar modal de hora extra
function showOvertimeForm() {
    document.getElementById('overtimeModal').classList.remove('hidden');
    
    // Definir data padrão como hoje
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('overtimeDate').value = today;
}

// Fechar modal
function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

// Lidar com envio de hora extra
async function handleOvertimeSubmit(e) {
    e.preventDefault();
    
    const formData = {
        user_id: currentUser.id,
        date: document.getElementById('overtimeDate').value,
        start_time: document.getElementById('startTime').value,
        end_time: document.getElementById('endTime').value,
        has_lunch: document.getElementById('hasLunch').checked,
        observations: document.getElementById('observations').value
    };
    
    // Validar horários
    if (formData.start_time >= formData.end_time) {
        alert('A hora de fim deve ser posterior à hora de início');
        return;
    }
    
    try {
        // Inserir no Supabase
        const { data, error } = await supabaseClient
            .from('overtime')
            .insert([formData])
            .select();
        
        if (error) {
            console.error('Erro ao salvar hora extra:', error);
            alert('Erro ao registrar hora extra. Tente novamente.');
            return;
        }
        
        // Atualizar dashboard
        await updateDashboard();
        
        // Fechar modal e limpar formulário
        closeModal('overtimeModal');
        document.getElementById('overtimeForm').reset();
        
        alert('Hora extra registrada com sucesso!');
        
    } catch (error) {
        console.error('Erro ao registrar hora extra:', error);
        alert('Erro ao registrar hora extra. Tente novamente.');
    }
}

// Mostrar relatórios
function showReports() {
    document.getElementById('reportsModal').classList.remove('hidden');
    generateReports();
}

// Gerar relatórios
async function generateReports() {
    const period = document.getElementById('reportPeriod').value;
    
    try {
        let query = supabaseClient
            .from('overtime')
            .select('*')
            .eq('user_id', currentUser.id);
        
        const now = new Date();
        let startDate = null;
        
        switch (period) {
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
        }
        
        if (startDate) {
            query = query.gte('date', startDate.toISOString().split('T')[0]);
        }
        
        const { data: userOvertime, error } = await query.order('date', { ascending: false });
        
        if (error) {
            console.error('Erro ao carregar relatórios:', error);
            return;
        }
        
        const filteredOvertime = userOvertime || [];
        const totalHours = calculateTotalHours(filteredOvertime);
        const totalValue = totalHours * OVERTIME_RATE;
        
        const reportHTML = `
            <div class="report-summary">
                <h4>Resumo do Período</h4>
                <div class="report-stats">
                    <div class="stat-item">
                        <span class="stat-label">Total de Horas:</span>
                        <span class="stat-value">${totalHours.toFixed(1)}h</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Valor Total:</span>
                        <span class="stat-value">${formatCurrency(totalValue)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Registros:</span>
                        <span class="stat-value">${filteredOvertime.length}</span>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('reportData').innerHTML = reportHTML;
        
    } catch (error) {
        console.error('Erro ao gerar relatórios:', error);
    }
}

// Mostrar histórico
function showHistory() {
    document.getElementById('historyModal').classList.remove('hidden');
    loadHistory();
}

// Carregar histórico
async function loadHistory() {
    try {
        const { data: userOvertime, error } = await supabaseClient
            .from('overtime')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('date', { ascending: false });
        
        if (error) {
            console.error('Erro ao carregar histórico:', error);
            return;
        }
        
        const overtimeList = userOvertime || [];
        
        const historyHTML = overtimeList.map(overtime => {
            let hours = calculateHoursDifference(overtime.start_time, overtime.end_time);
            if (overtime.has_lunch) {
                hours -= LUNCH_DEDUCTION;
            }
            hours = Math.max(0, hours);
            
            const value = hours * OVERTIME_RATE;
            
            return `
                <div class="list-item">
                    <div class="list-item-header">
                        <div class="list-item-title">
                            ${formatDate(overtime.date)} - ${overtime.start_time} às ${overtime.end_time}
                        </div>
                    </div>
                    <div class="list-item-details">
                        <div class="detail-item">
                            <span class="detail-label">Horas:</span> ${hours.toFixed(1)}h
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Valor:</span> ${formatCurrency(value)}
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Almoço:</span> ${overtime.has_lunch ? 'Sim' : 'Não'}
                        </div>
                        ${overtime.observations ? `
                        <div class="detail-item full-width">
                            <span class="detail-label">Observações:</span> ${overtime.observations}
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        document.getElementById('historyList').innerHTML = historyHTML || 
            '<div class="no-data">Nenhuma hora extra registrada ainda.</div>';
            
    } catch (error) {
        console.error('Erro ao carregar histórico:', error);
    }
}

// Formatar data
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
}

// Mostrar modais de ação
function showWithdrawModal() {
    alert('Funcionalidade de saque será implementada em versão futura');
}

function showReceiptsModal() {
    alert('Funcionalidade de receitas será implementada em versão futura');
}

// Funções administrativas
async function loadAdminData() {
    await loadUsers();
    await loadAllOvertime();
}

async function loadUsers() {
    try {
        const { data: users, error } = await supabaseClient
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Erro ao carregar usuários:', error);
            return;
        }
        
        const usersHTML = users.map(user => `
            <div class="list-item">
                <div class="list-item-header">
                    <div class="list-item-title">${user.name}</div>
                    <div class="list-item-actions">
                        <button class="btn-small btn-edit" onclick="editUser(${user.id})">Editar</button>
                        <button class="btn-small btn-delete" onclick="deleteUser(${user.id})">Excluir</button>
                    </div>
                </div>
                <div class="list-item-details">
                    <div class="detail-item">
                        <span class="detail-label">Usuário:</span> ${user.username}
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">E-mail:</span> ${user.email}
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Admin:</span> ${user.is_admin ? 'Sim' : 'Não'}
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Criado em:</span> ${formatDate(user.created_at)}
                    </div>
                </div>
            </div>
        `).join('');
        
        document.getElementById('usersList').innerHTML = usersHTML || 
            '<div class="no-data">Nenhum usuário cadastrado.</div>';
            
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
    }
}

async function loadAllOvertime() {
    try {
        const { data: overtime, error } = await supabaseClient
            .from('overtime')
            .select(`
                *,
                users!inner(name)
            `)
            .order('date', { ascending: false });
        
        if (error) {
            console.error('Erro ao carregar horas extras:', error);
            return;
        }
        
        const overtimeHTML = overtime.map(overtime => {
            let hours = calculateHoursDifference(overtime.start_time, overtime.end_time);
            if (overtime.has_lunch) {
                hours -= LUNCH_DEDUCTION;
            }
            hours = Math.max(0, hours);
            
            const value = hours * OVERTIME_RATE;
            
            return `
                <div class="list-item">
                    <div class="list-item-header">
                        <div class="list-item-title">
                            ${overtime.users.name} - ${formatDate(overtime.date)}
                        </div>
                        <div class="list-item-actions">
                            <button class="btn-small btn-edit" onclick="editOvertime(${overtime.id})">Editar</button>
                            <button class="btn-small btn-delete" onclick="deleteOvertime(${overtime.id})">Excluir</button>
                        </div>
                    </div>
                    <div class="list-item-details">
                        <div class="detail-item">
                            <span class="detail-label">Horário:</span> ${overtime.start_time} às ${overtime.end_time}
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Horas:</span> ${hours.toFixed(1)}h
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Valor:</span> ${formatCurrency(value)}
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Almoço:</span> ${overtime.has_lunch ? 'Sim' : 'Não'}
                        </div>
                        ${overtime.observations ? `
                        <div class="detail-item full-width">
                            <span class="detail-label">Observações:</span> ${overtime.observations}
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        document.getElementById('adminOvertimeList').innerHTML = overtimeHTML || 
            '<div class="no-data">Nenhuma hora extra registrada.</div>';
            
    } catch (error) {
        console.error('Erro ao carregar horas extras:', error);
    }
}

// Abas administrativas
function showAdminTab(tabName) {
    // Remover classe active de todas as abas
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.admin-tab-content').forEach(content => content.classList.add('hidden'));
    
    // Ativar aba selecionada
    event.target.classList.add('active');
    document.getElementById(`admin${tabName.charAt(0).toUpperCase() + tabName.slice(1)}Tab`).classList.remove('hidden');
    
    // Carregar dados específicos da aba
    switch (tabName) {
        case 'users':
            loadUsers();
            break;
        case 'overtime':
            loadAllOvertime();
            break;
        case 'reports':
            generateAdminReports();
            break;
    }
}

// Gerar relatórios administrativos
async function generateAdminReports() {
    try {
        // Buscar usuários
        const { data: users, error: usersError } = await supabaseClient
            .from('users')
            .select('id, name')
            .eq('is_admin', false);
        
        if (usersError) {
            console.error('Erro ao carregar usuários:', usersError);
            return;
        }
        
        // Buscar todas as horas extras
        const { data: overtime, error: overtimeError } = await supabaseClient
            .from('overtime')
            .select('*');
        
        if (overtimeError) {
            console.error('Erro ao carregar horas extras:', overtimeError);
            return;
        }
        
        const totalUsers = users.length;
        const totalOvertime = overtime.length;
        const totalHours = calculateTotalHours(overtime);
        const totalValue = totalHours * OVERTIME_RATE;
        
        // Estatísticas por usuário
        const userStats = users.map(user => {
            const userOvertime = overtime.filter(o => o.user_id === user.id);
            const userHours = calculateTotalHours(userOvertime);
            const userValue = userHours * OVERTIME_RATE;
            
            return {
                name: user.name,
                hours: userHours,
                value: userValue,
                records: userOvertime.length
            };
        });
        
        const reportsHTML = `
            <div class="admin-reports-summary">
                <h4>Resumo Geral</h4>
                <div class="report-stats">
                    <div class="stat-item">
                        <span class="stat-label">Total de Usuários:</span>
                        <span class="stat-value">${totalUsers}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Total de Registros:</span>
                        <span class="stat-value">${totalOvertime}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Total de Horas:</span>
                        <span class="stat-value">${totalHours.toFixed(1)}h</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Valor Total:</span>
                        <span class="stat-value">${formatCurrency(totalValue)}</span>
                    </div>
                </div>
            </div>
            
            <div class="user-stats">
                <h4>Estatísticas por Usuário</h4>
                ${userStats.map(stat => `
                    <div class="list-item">
                        <div class="list-item-header">
                            <div class="list-item-title">${stat.name}</div>
                        </div>
                        <div class="list-item-details">
                            <div class="detail-item">
                                <span class="detail-label">Horas:</span> ${stat.hours.toFixed(1)}h
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Valor:</span> ${formatCurrency(stat.value)}
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Registros:</span> ${stat.records}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        document.getElementById('adminReports').innerHTML = reportsHTML;
        
    } catch (error) {
        console.error('Erro ao gerar relatórios administrativos:', error);
    }
}

// Funções de gerenciamento de usuários
async function showAddUserModal() {
    const name = prompt('Nome do usuário:');
    if (!name) return;
    
    const username = prompt('Nome de usuário:');
    if (!username) return;
    
    const email = prompt('E-mail:');
    if (!email) return;
    
    const password = prompt('Senha:');
    if (!password) return;
    
    const isAdmin = confirm('É administrador?');
    
    try {
        const { data, error } = await supabaseClient
            .from('users')
            .insert([{
                name: name,
                username: username,
                email: email,
                password: password,
                is_admin: isAdmin
            }])
            .select();
        
        if (error) {
            console.error('Erro ao criar usuário:', error);
            alert('Erro ao criar usuário. Tente novamente.');
            return;
        }
        
        await loadUsers();
        alert('Usuário adicionado com sucesso!');
        
    } catch (error) {
        console.error('Erro ao criar usuário:', error);
        alert('Erro ao criar usuário. Tente novamente.');
    }
}

async function editUser(userId) {
    try {
        // Buscar usuário atual
        const { data: user, error: fetchError } = await supabaseClient
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();
        
        if (fetchError || !user) {
            alert('Usuário não encontrado');
            return;
        }
        
        const newName = prompt('Nome:', user.name);
        if (!newName) return;
        
        const newUsername = prompt('Usuário:', user.username);
        if (!newUsername) return;
        
        const newEmail = prompt('E-mail:', user.email);
        if (!newEmail) return;
        
        const newPassword = prompt('Nova senha (deixe em branco para manter):');
        
        const updateData = {
            name: newName,
            username: newUsername,
            email: newEmail
        };
        
        if (newPassword) {
            updateData.password = newPassword;
        }
        
        const { error: updateError } = await supabaseClient
            .from('users')
            .update(updateData)
            .eq('id', userId);
        
        if (updateError) {
            console.error('Erro ao atualizar usuário:', updateError);
            alert('Erro ao atualizar usuário. Tente novamente.');
            return;
        }
        
        await loadUsers();
        alert('Usuário atualizado com sucesso!');
        
    } catch (error) {
        console.error('Erro ao editar usuário:', error);
        alert('Erro ao editar usuário. Tente novamente.');
    }
}

async function deleteUser(userId) {
    if (!confirm('Tem certeza que deseja excluir este usuário? Isso também excluirá todas as horas extras dele.')) return;
    
    try {
        // Primeiro excluir as horas extras do usuário
        const { error: overtimeError } = await supabaseClient
            .from('overtime')
            .delete()
            .eq('user_id', userId);
        
        if (overtimeError) {
            console.error('Erro ao excluir horas extras:', overtimeError);
        }
        
        // Depois excluir o usuário
        const { error: userError } = await supabaseClient
            .from('users')
            .delete()
            .eq('id', userId);
        
        if (userError) {
            console.error('Erro ao excluir usuário:', userError);
            alert('Erro ao excluir usuário. Tente novamente.');
            return;
        }
        
        await loadUsers();
        alert('Usuário excluído com sucesso!');
        
    } catch (error) {
        console.error('Erro ao excluir usuário:', error);
        alert('Erro ao excluir usuário. Tente novamente.');
    }
}

// Funções de gerenciamento de horas extras
async function showAddOvertimeModal() {
    try {
        // Buscar usuários
        const { data: users, error: usersError } = await supabaseClient
            .from('users')
            .select('id, name')
            .eq('is_admin', false);
        
        if (usersError || !users || users.length === 0) {
            alert('Nenhum usuário cadastrado. Adicione um usuário primeiro.');
            return;
        }
        
        const userOptions = users.map(user => `${user.id}: ${user.name}`).join('\n');
        const userChoice = prompt(`Escolha o usuário (digite o número):\n${userOptions}`);
        if (!userChoice) return;
        
        const userId = parseInt(userChoice.split(':')[0]);
        const user = users.find(u => u.id === userId);
        if (!user) return;
        
        const date = prompt('Data (YYYY-MM-DD):');
        if (!date) return;
        
        const startTime = prompt('Hora de início (HH:MM):');
        if (!startTime) return;
        
        const endTime = prompt('Hora de fim (HH:MM):');
        if (!endTime) return;
        
        const hasLunch = confirm('Teve horário de almoço?');
        
        const observations = prompt('Observações (opcional):');
        
        const { data, error } = await supabaseClient
            .from('overtime')
            .insert([{
                user_id: userId,
                date: date,
                start_time: startTime,
                end_time: endTime,
                has_lunch: hasLunch,
                observations: observations || ''
            }])
            .select();
        
        if (error) {
            console.error('Erro ao adicionar hora extra:', error);
            alert('Erro ao adicionar hora extra. Tente novamente.');
            return;
        }
        
        await loadAllOvertime();
        alert('Hora extra adicionada com sucesso!');
        
    } catch (error) {
        console.error('Erro ao adicionar hora extra:', error);
        alert('Erro ao adicionar hora extra. Tente novamente.');
    }
}

async function editOvertime(overtimeId) {
    try {
        // Buscar hora extra atual
        const { data: overtime, error: fetchError } = await supabaseClient
            .from('overtime')
            .select('*')
            .eq('id', overtimeId)
            .single();
        
        if (fetchError || !overtime) {
            alert('Registro não encontrado');
            return;
        }
        
        const newDate = prompt('Data (YYYY-MM-DD):', overtime.date);
        if (!newDate) return;
        
        const newStartTime = prompt('Hora de início (HH:MM):', overtime.start_time);
        if (!newStartTime) return;
        
        const newEndTime = prompt('Hora de fim (HH:MM):', overtime.end_time);
        if (!newEndTime) return;
        
        const hasLunch = confirm('Teve horário de almoço?');
        
        const newObservations = prompt('Observações:', overtime.observations || '');
        
        const { error: updateError } = await supabaseClient
            .from('overtime')
            .update({
                date: newDate,
                start_time: newStartTime,
                end_time: newEndTime,
                has_lunch: hasLunch,
                observations: newObservations || ''
            })
            .eq('id', overtimeId);
        
        if (updateError) {
            console.error('Erro ao atualizar hora extra:', updateError);
            alert('Erro ao atualizar registro. Tente novamente.');
            return;
        }
        
        await loadAllOvertime();
        alert('Registro atualizado com sucesso!');
        
    } catch (error) {
        console.error('Erro ao editar hora extra:', error);
        alert('Erro ao editar registro. Tente novamente.');
    }
}

async function deleteOvertime(overtimeId) {
    if (!confirm('Tem certeza que deseja excluir este registro?')) return;
    
    try {
        const { error } = await supabaseClient
            .from('overtime')
            .delete()
            .eq('id', overtimeId);
        
        if (error) {
            console.error('Erro ao excluir hora extra:', error);
            alert('Erro ao excluir registro. Tente novamente.');
            return;
        }
        
        await loadAllOvertime();
        alert('Registro excluído com sucesso!');
        
    } catch (error) {
        console.error('Erro ao excluir hora extra:', error);
        alert('Erro ao excluir registro. Tente novamente.');
    }
}

// Funções de armazenamento local removidas - agora usando Supabase

// CSS adicional para relatórios
const additionalCSS = `
.report-summary,
.admin-reports-summary {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 20px;
    border: 1px solid rgba(255, 255, 255, 0.2);
}

.report-summary h4,
.admin-reports-summary h4 {
    color: #00d4aa;
    margin-bottom: 15px;
    font-size: 1.2rem;
}

.report-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 15px;
}

.stat-item {
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.stat-label {
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.7);
}

.stat-value {
    font-size: 1.2rem;
    font-weight: 600;
    color: #ffffff;
}

.user-stats h4 {
    color: #00d4aa;
    margin: 20px 0 15px 0;
    font-size: 1.1rem;
}

.no-data {
    text-align: center;
    color: rgba(255, 255, 255, 0.6);
    padding: 40px;
    font-style: italic;
}

.full-width {
    grid-column: 1 / -1;
}
`;

// Adicionar CSS adicional
const style = document.createElement('style');
style.textContent = additionalCSS;
document.head.appendChild(style);
