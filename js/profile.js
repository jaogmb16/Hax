// js/profile.js
import { supabase } from './supabase.js';
import { currentAuthUser, currentUserDoc } from './auth.js';

// Converte o telefone cadastrado em um link direto do WhatsApp (https://wa.me/<numero>).
// Retorna '' se não houver dígitos válidos (nesse caso o botão não é exibido).
function buildWhatsappLink(phone) {
    if (!phone) return '';
    let digits = String(phone).replace(/\D/g, '');
    if (!digits) return '';
    // Número brasileiro sem código do país (10 ou 11 dígitos) -> prefixa 55.
    if (digits.length <= 11) digits = '55' + digits;
    return 'https://wa.me/' + digits;
}

export async function uploadImage(file, path) {
    return new Promise((resolve) => {
        if (!file) { resolve(null); return; }
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX = 250;
                let width = img.width;
                let height = img.height;
                if (width > height) { if (width > MAX) { height *= MAX / width; width = MAX; } }
                else { if (height > MAX) { width *= MAX / height; height = MAX; } }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.onerror = () => resolve(null);
        };
        reader.onerror = () => resolve(null);
    });
}

export async function uploadSmallFile(file) {
    return new Promise((resolve) => {
        if (!file) { resolve(null); return; }
        if (file.size > 800000) {
            window.showToast("O arquivo anexado excede o limite (800 KB). Envie um documento ou imagem mais leve.", 'error');
            resolve(null);
            return;
        }
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => resolve({ data: e.target.result, name: file.name });
        reader.onerror = () => resolve(null);
    });
}

export async function loadUserProfile(uid) {
    const card = document.getElementById('view-profile-card');
    const loading = document.getElementById('view-profile-loading');

    if (!card || !loading) return;

    card.style.display = 'none';
    loading.style.display = 'block';

    try {
        let userData = null;
        let userType = 'employer';

        let { data: companyData } = await supabase
            .from('companies')
            .select('*')
            .eq('id', uid)
            .maybeSingle();

        if (companyData) {
            userData = companyData;
        } else {
            let { data: candidateData } = await supabase
                .from('candidates')
                .select('*')
                .eq('id', uid)
                .maybeSingle();

            if (candidateData) {
                userData = candidateData;
                userType = 'candidate';
            }
        }

        if (!userData) {
            loading.innerText = 'Usuário não encontrado na base de dados.';
            return;
        }

        document.getElementById('view-profile-pic').src = userData.photo || "criadores/default.jpg";
        document.getElementById('view-profile-name').innerText = userData.name || "Sem Nome";
        if (userType === 'employer') {
            document.getElementById('view-profile-role').style.display = 'none';
        } else {
            document.getElementById('view-profile-role').style.display = 'block';
            document.getElementById('view-profile-role').innerText = userData.role || "-";
        }

        const detailsContainer = document.getElementById('view-profile-details');
        if (userType === 'employer') {
            let jobsHtml = '';
            if (userData.jobs && userData.jobs.length > 0) {
                const openJobs = userData.jobs.filter(j => j.status === 'open');
                if (openJobs.length > 0) {
                    jobsHtml = '<h4 style="margin-top:20px; color:var(--blood-wine); font-size:1.2rem;">🚀 Vagas Abertas Atualmente</h4>';
                    openJobs.forEach(j => {
                        let workHoursText = '';
                        if (j.workStart || j.workLunch || j.workEnd) {
                            workHoursText = `&nbsp;|&nbsp; 🕒 Horário: ${j.workStart || '-'} às ${j.workEnd || '-'} (Almoço: ${j.workLunch || '-'})`;
                        }
                        jobsHtml += `
                            <div style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px; margin-top: 10px; border-left: 4px solid var(--blood-wine);">
                                <h5 style="margin: 0 0 5px; font-size: 1.15rem; color: #fff;">${j.role}</h5>
                                <p style="margin: 0; font-size: 1rem;">📍 ${j.location || userData.location || 'Local não informado'} &nbsp;|&nbsp; 💰 ${j.salary}${workHoursText}</p>
                                <p style="margin: 8px 0 0; font-size: 0.95rem; color: #bbb;">${j.desc}</p>
                            </div>
                        `;
                    });
                } else {
                    jobsHtml = '<p style="margin-top:20px; color:#aaa; font-style:italic;">Não há vagas abertas no momento para esta empresa.</p>';
                }
            } else if (userData.role) {
                let initialWorkHours = '';
                if (userData.workStart || userData.workLunch || userData.workEnd) {
                    initialWorkHours = `&nbsp;|&nbsp; 🕒 Horário: ${userData.workStart || '-'} às ${userData.workEnd || '-'} (Almoço: ${userData.workLunch || '-'})`;
                }
                jobsHtml = `
                    <h4 style="margin-top:20px; color:var(--blood-wine); font-size:1.2rem;">🚀 Vaga Principal</h4>
                    <div style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px; margin-top: 10px; border-left: 4px solid var(--blood-wine);">
                        <h5 style="margin: 0 0 5px; font-size: 1.15rem; color: #fff;">${userData.role}</h5>
                        <p style="margin: 0; font-size: 1rem;">📍 ${userData.location || 'Local não informado'} &nbsp;|&nbsp; 💰 ${userData.salary || 'A Combinar'}${initialWorkHours}</p>
                    </div>
                `;
            }

            detailsContainer.innerHTML = `
                <div style="display:flex; gap:20px; margin-bottom: 25px; flex-wrap:wrap;">
                    <div style="flex:1; min-width: 150px;">
                        <h4 style="color:var(--blood-wine); margin-bottom: 5px; font-size:1.1rem;">🏢 Porte</h4>
                        <p style="margin:0; font-size:1.15rem;">${userData.size || 'Não informado'}</p>
                    </div>
                    <div style="flex:1; min-width: 150px;">
                        <h4 style="color:var(--blood-wine); margin-bottom: 5px; font-size:1.1rem;">⚙️ Ramo / Atuação</h4>
                        <p style="margin:0; font-size:1.15rem;">${userData.industry || 'Não informado'}</p>
                    </div>
                </div>
                <div style="margin-bottom: 25px;">
                    <h4 style="color:var(--blood-wine); margin-bottom: 5px; font-size:1.1rem;">📍 Sede / Extensão</h4>
                    <p style="margin:0; font-size:1.15rem;">${userData.location || 'Não informado'}</p>
                </div>
                ${userData.phone ? `
                <div style="margin-bottom: 25px;">
                    <h4 style="color:var(--blood-wine); margin-bottom: 5px; font-size:1.1rem;">📞 Contato RH/Empresa</h4>
                    <p style="margin:0; font-size:1.15rem;">${userData.phone}</p>
                    <a href="${buildWhatsappLink(userData.phone)}" target="_blank" rel="noopener" class="whatsapp-btn" style="margin-top:15px;">
                        <i class="fab fa-whatsapp"></i> Chamar no WhatsApp
                    </a>
                </div>` : ''}
                <div style="margin-bottom: 25px;">
                    <h4 style="color:var(--blood-wine); margin-bottom: 5px; font-size:1.1rem;">📝 Sobre a Empresa</h4>
                    <p style="margin:0; font-size:1.15rem;">${userData.desc || 'Sem descrição detalhada ou manual.'}</p>
                </div>
                ${jobsHtml}
            `;
        } else {
            detailsContainer.innerHTML = `
                <div style="display:flex; gap:20px; margin-bottom: 25px; flex-wrap:wrap;">
                    <div style="flex:1; min-width: 150px;">
                        <h4 style="color:var(--blood-wine); margin-bottom: 5px; font-size:1.1rem;">👤 Idade</h4>
                        <p style="margin:0; font-size:1.15rem;">${userData.age ? userData.age + ' anos' : 'Não informado'}</p>
                    </div>
                    <div style="flex:1; min-width: 150px;">
                        <h4 style="color:var(--blood-wine); margin-bottom: 5px; font-size:1.1rem;">📍 Localização</h4>
                        <p style="margin:0; font-size:1.15rem;">${userData.location || 'Não informada'}</p>
                    </div>
                </div>
                <div style="margin-bottom: 25px;">
                    <h4 style="color:var(--blood-wine); margin-bottom: 5px; font-size:1.1rem;">🎓 Formação Base</h4>
                    <p style="margin:0; font-size:1.15rem;">${userData.education || 'Não informada'}</p>
                </div>
                <div style="margin-bottom: 25px;">
                    <h4 style="color:var(--blood-wine); margin-bottom: 5px; font-size:1.1rem;">⏳ Tempo de Experiência</h4>
                    <p style="margin:0; font-size:1.15rem;">${userData.exp || 'Não informado'}</p>
                </div>
                <div style="margin-bottom: 25px;">
                    <h4 style="color:var(--blood-wine); margin-bottom: 5px; font-size:1.1rem;">🎯 Principais Domínios (Skills)</h4>
                    <p style="margin:0; font-size:1.15rem;">${userData.skill || 'Não listadas'}</p>
                </div>
                ${userData.phone ? `
                <div style="margin-bottom: 25px;">
                    <h4 style="color:var(--blood-wine); margin-bottom: 5px; font-size:1.1rem;">📞 Contato Profissional</h4>
                    <p style="margin:0; font-size:1.15rem;">${userData.phone}</p>
                    <a href="${buildWhatsappLink(userData.phone)}" target="_blank" rel="noopener" class="whatsapp-btn" style="margin-top:15px;">
                        <i class="fab fa-whatsapp"></i> Chamar no WhatsApp
                    </a>
                </div>` : ''}
                ${userData.file ? `
                <div style="margin-top: 30px; padding-top: 25px; border-top: 1px solid #444; text-align:center;">
                    <a href="${userData.file.data || userData.file}" download="${userData.file.name || 'documento_anexo'}" style="display:inline-block; background:var(--blood-wine); padding:12px 25px; border-radius:30px; color:#fff; text-decoration:none; font-weight:bold; letter-spacing:0.5px; transition:0.3s; font-size:1rem;">
                        <i class="fas fa-download"></i> BAIXAR DOCUMENTO / PORTFÓLIO
                    </a>
                </div>` : (userData.link ? `
                <div style="margin-top: 30px; padding-top: 25px; border-top: 1px solid #444; text-align:center;">
                    <a href="${userData.link.startsWith('http') ? userData.link : 'https://'+userData.link}" target="_blank" style="display:inline-block; background:var(--blood-wine); padding:12px 25px; border-radius:30px; color:#fff; text-decoration:none; font-weight:bold; letter-spacing:0.5px; transition:0.3s; font-size:1rem;">
                        <i class="fas fa-external-link-alt"></i> ACESSAR TRABALHOS ANTIGOS
                    </a>
                </div>` : '')}
            `;
        }

        const chatBtn = document.getElementById('view-profile-msg-btn');
        const editBtn = document.getElementById('view-profile-edit-btn');
        if (currentAuthUser && currentAuthUser.id === uid) {
            chatBtn.style.display = 'none';
            if (editBtn) {
                editBtn.style.display = 'block';
                editBtn.onclick = () => {
                    window.location.hash = "#edit-profile";
                };
            }
        } else {
            if (editBtn) editBtn.style.display = 'none';
            chatBtn.style.display = 'block';
            chatBtn.onclick = () => {
                window.startChat(uid, userData.name.split(' ')[0]);
            };
        }

        loading.style.display = 'none';
        card.style.display = 'block';
    } catch (e) {
        console.error("Erro ao carregar perfil público", e);
        loading.innerText = 'Erro de conexão ao carregar cartão de visitas.';
    }
}

export function loadEditProfile() {
    if (!currentUserDoc) return;

    document.getElementById('edit-name').value = currentUserDoc.name || '';

    const container = document.getElementById('edit-dynamic-fields');
    const jobsManager = document.getElementById('employer-jobs-manager');
    const isEmployer = currentUserDoc.exp === undefined;

    if (isEmployer) {
        jobsManager.style.display = 'block';
        container.innerHTML = `
            <div class="input-group">
                <label>Área de Atuação / Ramo (Opcional)</label>
                <input type="text" id="edit-industry" value="${currentUserDoc.industry || ''}">
            </div>
            <div class="input-group select-group">
                <label>Tamanho (Porte da Empresa)</label>
                <select id="edit-size">
                    <option value="Pequena" ${currentUserDoc.size === 'Pequena' ? 'selected' : ''}>Pequena (1 a 49 pessoas)</option>
                    <option value="Média" ${currentUserDoc.size === 'Média' ? 'selected' : ''}>Média (50 a 249 pessoas)</option>
                    <option value="Grande" ${currentUserDoc.size === 'Grande' ? 'selected' : ''}>Grande (250+ pessoas)</option>
                </select>
            </div>
            <div class="input-group">
                <label>Contato RH / WhatsApp Corporativo (Opcional)</label>
                <input type="text" id="edit-phone" value="${currentUserDoc.phone || ''}">
            </div>
            <div class="input-group">
                <label>Localização Principal</label>
                <input type="text" id="edit-location" value="${currentUserDoc.location || ''}">
            </div>
            <div class="input-group">
                <label>Sobre a Empresa / Descrição Padrão</label>
                <textarea id="edit-desc" rows="3">${currentUserDoc.desc || ''}</textarea>
            </div>
        `;
        renderJobsManager();
    } else {
        jobsManager.style.display = 'none';
        container.innerHTML = `
            <div style="display:flex; gap:10px;" class="input-group">
                <div style="flex:1;">
                    <label>Sua Idade</label>
                    <input type="number" id="edit-age" value="${currentUserDoc.age || ''}" required>
                </div>
                <div style="flex:2;">
                    <label>Sua Localização / Cidade</label>
                    <input type="text" id="edit-location" value="${currentUserDoc.location || ''}" required>
                </div>
            </div>
            <div class="input-group">
                <label>Telefone / WhatsApp Profissional</label>
                <input type="text" id="edit-phone" value="${currentUserDoc.phone || ''}" required>
            </div>
            <div class="input-group select-group">
                <label>Formação Base (Escolaridade)</label>
                <select id="edit-education" required>
                    <option value="Ensino Fundamental" ${currentUserDoc.education === 'Ensino Fundamental' ? 'selected' : ''}>Ensino Fundamental</option>
                    <option value="Ensino Médio" ${currentUserDoc.education === 'Ensino Médio' ? 'selected' : ''}>Ensino Médio</option>
                    <option value="Técnico/Profissionalizante" ${currentUserDoc.education === 'Técnico/Profissionalizante' ? 'selected' : ''}>Técnico/Profissionalizante</option>
                    <option value="Ensino Superior" ${currentUserDoc.education === 'Ensino Superior' ? 'selected' : ''}>Ensino Superior / Especialização</option>
                </select>
            </div>
            <div class="input-group">
                <label>Seu Cargo / Área</label>
                <input type="text" id="edit-role" value="${currentUserDoc.role || ''}" required>
            </div>
            <div class="input-group">
                <label>Tempo de Experiência</label>
                <input type="text" id="edit-exp" value="${currentUserDoc.exp || ''}" required>
            </div>
            <div class="input-group">
                <label>Sua principal habilidade</label>
                <input type="text" id="edit-skill" value="${currentUserDoc.skill || ''}" required>
            </div>
            <div class="input-group">
                <label>Anexar Documento de Referência (Máx 800KB)</label>
                <input type="file" id="edit-file" accept=".pdf,.doc,.docx,image/*" class="file-input">
            </div>
        `;
    }
}

export function renderJobsManager() {
    const list = document.getElementById('jobs-list');
    let jobs = currentUserDoc.jobs || [];

    if (jobs.length === 0 && currentUserDoc.role) {
        jobs.push({
            id: Date.now().toString(),
            role: currentUserDoc.role,
            type: currentUserDoc.type || '',
            salary: currentUserDoc.salary || '',
            desc: currentUserDoc.desc || '',
            status: 'open'
        });
        currentUserDoc.jobs = jobs;
    }

    list.innerHTML = '';
    if (jobs.length === 0) {
        list.innerHTML = '<p style="color:#aaa; font-size:0.9rem;">Nenhuma vaga cadastrada.</p>';
    }

    jobs.forEach((job, index) => {
        list.innerHTML += `
            <div style="background:var(--gray-dark); padding:15px; margin-bottom:10px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <h4 style="margin:0; color:var(--text-light);">${job.role}</h4>
                    <span style="font-size:0.85rem; color:${job.status === 'open' ? 'green' : 'red'};">${job.status === 'open' ? 'Vaga Aberta' : 'Vaga Ocupada'}</span>
                </div>
                <div style="display:flex; flex-direction:column; gap:5px; align-items:stretch; width:150px;">
                    <button type="button" onclick="window.location.hash='#edit-job?id=${job.id}'" class="submit-btn outline" style="margin:0; width:100%; padding:5px 10px; font-size:0.75rem; background:transparent; border: 1px solid var(--blood-wine); color: white;">
                        EDITAR VAGA
                    </button>
                    <button type="button" onclick="window.toggleJobStatus(${index})" class="submit-btn" style="margin:0; width:100%; padding:5px 10px; font-size:0.75rem; background:${job.status === 'open' ? 'var(--gray-medium)' : 'var(--blood-wine)'};">
                        ${job.status === 'open' ? 'MARCAR OCUPADA' : 'REABRIR VAGA'}
                    </button>
                </div>
            </div>
        `;
    });
}
