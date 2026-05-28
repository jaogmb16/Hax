// js/main.js
import { initAuth, loginUser, registerUser, logoutUser, currentUserDoc, currentAuthUser } from './auth.js';
import { uploadImage, uploadSmallFile } from './profile.js';
import { initRouter } from './router.js';
import { getCompanies, getCandidates } from './database.js';
import { sendMessage, openChat } from './chat.js';
import { initResumeBuilder } from './resume.js';
import { supabase } from './supabase.js';
import { renderJobsManager } from './profile.js';

let tempProfileData = null;
let tempPhotoFile = null;
let flowType = '';

document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    initRouter();
    initResumeBuilder();

    // Hamburger menu para mobile
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const navbar = document.getElementById('navbar');
    if (hamburgerBtn && navbar) {
        hamburgerBtn.addEventListener('click', () => {
            navbar.classList.toggle('open');
            hamburgerBtn.classList.toggle('active');
        });
        navbar.querySelectorAll('.nav-link, .login-btn-link, .login-btn').forEach(link => {
            link.addEventListener('click', () => {
                navbar.classList.remove('open');
                hamburgerBtn.classList.remove('active');
            });
        });
    }

    // Tabs do Auth
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const formLogin = document.getElementById('form-login');
    const formRegister = document.getElementById('form-register');

    if (tabLogin && tabRegister) {
        tabLogin.addEventListener('click', (e) => {
            e.preventDefault();
            tabLogin.classList.add('active');
            tabRegister.classList.remove('active');
            formLogin.classList.remove('hidden');
            formRegister.classList.add('hidden');
        });
        tabRegister.addEventListener('click', (e) => {
            e.preventDefault();
            tabRegister.classList.add('active');
            tabLogin.classList.remove('active');
            formRegister.classList.remove('hidden');
            formLogin.classList.add('hidden');
        });
    }

    const consentToggle = document.getElementById('consent-toggle');
    const consentMore = document.getElementById('consent-more');
    if (consentToggle && consentMore) {
        consentToggle.addEventListener('click', (e) => {
            e.preventDefault();
            const isHidden = consentMore.classList.toggle('hidden');
            consentToggle.innerText = isHidden ? 'Ler mais' : 'Ler menos';
        });
    }

    // Formulários de Perfil
    const formCompany = document.getElementById('form-company');
    if (formCompany) {
        formCompany.addEventListener('submit', (e) => {
            e.preventDefault();
            flowType = 'employer';
            const fInput = document.getElementById('comp-photo');
            if (fInput && fInput.files[0]) { tempPhotoFile = fInput.files[0]; }

            tempProfileData = {
                name: document.getElementById('comp-name').value,
                industry: document.getElementById('comp-industry').value || '',
                size: document.getElementById('comp-size').value || '',
                phone: document.getElementById('comp-phone').value || '',
                role: document.getElementById('comp-role').value,
                location: document.getElementById('comp-location').value,
                type: document.getElementById('comp-type').value,
                salary: document.getElementById('comp-salary').value,
                desc: document.getElementById('comp-desc').value,
                workStart: document.getElementById('comp-work-start').value || '',
                workLunch: document.getElementById('comp-work-lunch').value || '',
                workEnd: document.getElementById('comp-work-end').value || ''
            };
            window.location.hash = "#auth";
            document.getElementById('tab-register').click();
        });
    }

    const formCandidate = document.getElementById('form-candidate');
    if (formCandidate) {
        formCandidate.addEventListener('submit', (e) => {
            e.preventDefault();
            flowType = 'candidate';
            const fInput = document.getElementById('cand-photo');
            if (fInput && fInput.files[0]) { tempPhotoFile = fInput.files[0]; }
            const docInput = document.getElementById('cand-file');
            if (docInput && docInput.files[0]) { window.tempDocFile = docInput.files[0]; }

            tempProfileData = {
                name: document.getElementById('cand-name').value,
                age: document.getElementById('cand-age').value,
                location: document.getElementById('cand-location').value,
                phone: document.getElementById('cand-phone').value,
                education: document.getElementById('cand-education').value,
                role: document.getElementById('cand-role').value,
                exp: document.getElementById('cand-exp').value,
                skill: document.getElementById('cand-skill').value,
                photo: 'criadores/default.jpg'
            };
            window.location.hash = "#auth";
            document.getElementById('tab-register').click();
        });
    }

    // Login Form Submit
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const pass = document.getElementById('login-password').value;
            await loginUser(email, pass);
        });
    }

    // Register Form Submit
    if (formRegister) {
        formRegister.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!tempProfileData) {
                window.showToast("Para criar uma conta, monte seu perfil primeiro.", 'info');
                window.location.hash = "#home";
                return;
            }

            const consentCheckbox = document.getElementById('reg-consent');
            if (!consentCheckbox || !consentCheckbox.checked) {
                window.showToast("Você precisa autorizar o armazenamento dos seus dados para criar uma conta.", 'error');
                return;
            }

            const email = document.getElementById('reg-email').value;
            const password = document.getElementById('reg-password').value;
            const passwordConfirm = document.getElementById('reg-password-confirm').value;

            if (password !== passwordConfirm) {
                window.showToast("As senhas não coincidem. Por favor, verifique.", 'error');
                return;
            }

            const btn = document.querySelector('#form-register .submit-btn');
            btn.innerText = "CRIANDO...";

            try {
                const user = await registerUser(email, password, tempProfileData, flowType);
                if (user) {
                    localStorage.setItem(`hax_consent_${user.id}`, JSON.stringify({
                        accepted: true,
                        date: new Date().toISOString()
                    }));
                    if (tempPhotoFile) {
                        btn.innerText = "ENVIANDO FOTO...";
                        const url = await uploadImage(tempPhotoFile);
                        if (url) {
                            const tableName = flowType === 'employer' ? 'companies' : 'candidates';
                            await supabase
                                .from(tableName)
                                .update({ photo: url })
                                .eq('id', user.id);

                            if (currentUserDoc && currentUserDoc.uid === user.id) {
                                currentUserDoc.photo = url;
                            }
                        }
                    }
                    if (window.tempDocFile) {
                        btn.innerText = "ENVIANDO ARQUIVO...";
                        const fileData = await uploadSmallFile(window.tempDocFile);
                        if (fileData) {
                            const tableName = flowType === 'employer' ? 'companies' : 'candidates';
                            await supabase
                                .from(tableName)
                                .update({ file: fileData })
                                .eq('id', user.id);

                            if (currentUserDoc && currentUserDoc.uid === user.id) {
                                currentUserDoc.file = fileData;
                            }
                        }
                        window.tempDocFile = null;
                    }
                    tempProfileData = null;
                    tempPhotoFile = null;
                }
            } finally {
               btn.innerText = "CRIAR CONTA";
            }
        });
    }

    window.viewUserProfile = (uid) => {
        window.targetProfileUid = uid;
        window.location.hash = "#profile";
    };

    // Edit Profile Events
    const formEditCommon = document.getElementById('form-edit-common');
    if (formEditCommon) {
        formEditCommon.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('edit-btn-submit');
            btn.innerText = "SALVANDO...";

            try {
                const isEmployer = currentUserDoc.exp === undefined;
                const updates = {};
                updates.name = document.getElementById('edit-name').value;

                if (isEmployer) {
                    updates.industry = document.getElementById('edit-industry').value;
                    updates.size = document.getElementById('edit-size').value;
                    updates.phone = document.getElementById('edit-phone').value;
                    updates.desc = document.getElementById('edit-desc').value;
                    updates.location = document.getElementById('edit-location').value;
                } else {
                    updates.age = document.getElementById('edit-age').value;
                    updates.location = document.getElementById('edit-location').value;
                    updates.phone = document.getElementById('edit-phone').value;
                    updates.education = document.getElementById('edit-education').value;
                    updates.role = document.getElementById('edit-role').value;
                    updates.exp = document.getElementById('edit-exp').value;
                    updates.skill = document.getElementById('edit-skill').value;

                    const fInput = document.getElementById('edit-file');
                    if (fInput && fInput.files && fInput.files[0]) {
                        const fileData = await uploadSmallFile(fInput.files[0]);
                        if (fileData) updates.file = fileData;
                    }
                }

                const fileInput = document.getElementById('edit-photo');
                if (fileInput && fileInput.files[0]) {
                    btn.innerText = "ENVIANDO FOTO...";
                    const url = await uploadImage(fileInput.files[0]);
                    if (url) updates.photo = url;
                }

                const tableName = isEmployer ? 'companies' : 'candidates';
                const { error } = await supabase
                    .from(tableName)
                    .update(updates)
                    .eq('id', currentUserDoc.uid);

                if (error) throw error;

                Object.assign(currentUserDoc, updates);

                window.showToast("Perfil atualizado com sucesso!", 'success');
                window.location.hash = "#profile";
            } catch (err) {
                console.error(err);
                window.showToast("Erro ao editar perfil: " + err.message, 'error');
            } finally {
                btn.innerText = "SALVAR ALTERAÇÕES";
            }
        });
    }

    const formAddJob = document.getElementById('form-add-job');
    if (formAddJob) {
        formAddJob.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-submit-new-job');
            btn.innerText = "PUBLICANDO...";
            try {
                if (!currentUserDoc.jobs) currentUserDoc.jobs = [];

                const newJob = {
                    id: Date.now().toString(),
                    role: document.getElementById('new-job-role').value,
                    salary: document.getElementById('new-job-salary').value,
                    type: document.getElementById('new-job-type').value,
                    location: document.getElementById('new-job-location').value || currentUserDoc.location || '',
                    desc: document.getElementById('new-job-desc').value,
                    workStart: document.getElementById('new-job-work-start').value || '',
                    workLunch: document.getElementById('new-job-work-lunch').value || '',
                    workEnd: document.getElementById('new-job-work-end').value || '',
                    status: 'open'
                };

                currentUserDoc.jobs.push(newJob);

                const { error } = await supabase
                    .from('companies')
                    .update({ jobs: currentUserDoc.jobs })
                    .eq('id', currentUserDoc.uid);

                if (error) throw error;

                window.showToast("Vaga publicada com sucesso!", 'success');
                formAddJob.reset();
                window.location.hash = "#edit-profile";
            } catch(e) {
                console.error(e);
                window.showToast("Erro ao publicar vaga.", 'error');
            } finally {
                btn.innerText = "PUBLICAR VAGA";
            }
        });
    }

    window.toggleJobStatus = async (index) => {
        if (!currentUserDoc || !currentUserDoc.jobs) return;
        currentUserDoc.jobs[index].status = currentUserDoc.jobs[index].status === 'open' ? 'closed' : 'open';

        await supabase
            .from('companies')
            .update({ jobs: currentUserDoc.jobs })
            .eq('id', currentUserDoc.uid);

        renderJobsManager();
    };

    // Chat Events
    const sendMsgBtn = document.getElementById('send-msg-btn');
    if (sendMsgBtn) sendMsgBtn.addEventListener('click', sendMessage);

    const msgInput = document.getElementById('message-input');
    if (msgInput) {
        msgInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    window.startChat = (uid, name) => {
        if(!currentAuthUser) {
            window.showToast("Faça login para poder conversar com os usuários.", 'info');
            window.location.hash = "#auth";
            return;
        }
        window.location.hash = "#chat";
        setTimeout(() => { openChat(uid, name); }, 200);
    };

    window.openChat = openChat;
    window.logout = logoutUser;
    window.toggleChatList = () => {
        const sidebar = document.getElementById('chat-sidebar');
        if (sidebar) sidebar.classList.toggle('closed');
    }
});


export async function renderLists(filterType = 'all') {
    const compGrid = document.getElementById('companies-grid');
    const empGrid = document.getElementById('employees-grid');

    // BLOQUEIO ACOLHEDOR: "para mim" exige cadastro (mensagens distintas por página)
    if (filterType === 'me' && !currentAuthUser) {
        const hash = window.location.hash || '';
        const isCompaniesPage = hash.includes('#companies');
        const isEmployeesPage = hash.includes('#employees');
        const targetGrid = isEmployeesPage ? empGrid : (isCompaniesPage ? compGrid : (compGrid || empGrid));

        const ctx = isEmployeesPage
            ? {
                titulo: 'Candidatos Compatíveis com Suas Vagas',
                subtitulo: 'Cadastre sua empresa e mostramos os talentos que combinam com as vagas que você publicou. Demora menos de 1 minuto.',
                altLink: 'Todos os Candidatos'
              }
            : {
                titulo: 'Vagas Personalizadas para Você',
                subtitulo: 'Crie seu perfil grátis e a gente conecta você com as empresas que combinam com o seu cargo e área.',
                altLink: 'Todas as Empresas'
              };

        if (targetGrid) {
            targetGrid.innerHTML = `
                <div class="login-required-card">
                    <div class="login-required-icon"><i class="fas fa-lock"></i></div>
                    <h3 class="login-required-title">${ctx.titulo}</h3>
                    <p class="login-required-text">${ctx.subtitulo}</p>
                    <div class="login-required-actions">
                        <a href="#auth" class="login-required-btn primary">CRIAR CONTA</a>
                        <a href="#auth" class="login-required-btn outline">JÁ TENHO CONTA</a>
                    </div>
                    <p class="login-required-hint">Você pode continuar olhando a lista completa sem cadastro — é só voltar e clicar em "${ctx.altLink}".</p>
                </div>
            `;
        }
        return;
    }

    const isMatch = (role1, role2) => {
        if (!role1 || !role2) return false;
        const r1 = role1.toLowerCase();
        const r2 = role2.toLowerCase();
        if (r1.includes(r2) || r2.includes(r1)) return true;
        const keys1 = r1.split(' ');
        const keys2 = r2.split(' ');
        return keys1.some(k => k.length > 3 && keys2.includes(k));
    };

    if(compGrid) {
        const companies = await getCompanies();
        compGrid.innerHTML = '';

        let jobsToRender = [];

        companies.forEach(c => {
             const pic = c.photo || 'criadores/default.jpg';
             let cJobs = c.jobs || [];
             if (cJobs.length === 0 && c.role) {
                 cJobs.push({ role: c.role, salary: c.salary, desc: c.desc, status: 'open', location: c.location });
             }

             cJobs.forEach(job => {
                  if (job.status === 'open') {
                      jobsToRender.push({ compUid: c.uid, compName: c.name, compPic: pic, location: job.location || c.location, ...job });
                  }
             });
        });

        if (filterType === 'me' && currentAuthUser && currentUserDoc) {
             const myRole = currentUserDoc.role || '';
             jobsToRender = jobsToRender.filter(j => isMatch(j.role, myRole));
        }

        if (jobsToRender.length === 0) compGrid.innerHTML = '<p>Nenhuma vaga cadastrada ou compatível com você.</p>';
        jobsToRender.forEach(j => {
             compGrid.innerHTML += `
                <div class="card-item">
                    <img src="${j.compPic}" class="employee-photo" onerror="this.src='https://via.placeholder.com/100'" style="margin: 0 auto 10px; width:60px;height:60px;border-width:2px; object-fit: cover;">
                    <h4>${j.compName}</h4><h5>${j.role}</h5>
                    <span class="card-detail">📍 ${j.location || 'Não informado'} | 💰 ${j.salary}</span>
                    <p class="card-desc" style="display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden;">${j.desc}</p>
                    <div style="display:flex; justify-content:center; gap:10px; margin-top:20px;">
                        <button class="submit-btn" style="padding:10px; flex:1;" onclick="window.startChat('${j.compUid}', '${j.compName.split(' ')[0]}')">CHAT</button>
                        <button class="submit-btn outline" style="padding:10px; flex:1; background:transparent; border: 2px solid var(--blood-wine); color: white;" onclick="window.viewUserProfile('${j.compUid}')">PERFIL</button>
                    </div>
                </div>`;
        });
    }

    if(empGrid) {
        const candidates = await getCandidates();
        empGrid.innerHTML = '';

        let cansToRender = candidates;
        if (filterType === 'me' && currentAuthUser && currentUserDoc) {
             let lookingForRoles = [];
             if (currentUserDoc.jobs) {
                 lookingForRoles = currentUserDoc.jobs.filter(j => j.status === 'open').map(j => j.role);
             } else if (currentUserDoc.role) {
                 lookingForRoles.push(currentUserDoc.role);
             }
             if(lookingForRoles.length > 0) {
                 cansToRender = cansToRender.filter(c => lookingForRoles.some(r => isMatch(r, c.role)));
             } else {
                 cansToRender = [];
             }
        }

        if (cansToRender.length === 0) empGrid.innerHTML = '<p>Nenhum talento cadastrado ou compatível com suas vagas atuais.</p>';
        cansToRender.forEach(can => {
            const pic = can.photo ? can.photo : 'criadores/default.jpg';
            empGrid.innerHTML += `
                <div class="card-item text-center">
                    <img src="${pic}" class="employee-photo" onerror="this.src='https://via.placeholder.com/100'" style="width:100px; height:100px; object-fit: cover; border: 3px solid var(--blood-wine);">
                    <h4>${can.name}</h4><h5>${can.role}</h5>
                    <div style="display:flex; justify-content:center; gap:10px; margin-top:20px;">
                        <button class="submit-btn" style="padding:10px; flex:1;" onclick="window.startChat('${can.uid}', '${can.name.split(' ')[0]}')">CHAT</button>
                        <button class="submit-btn outline" style="padding:10px; flex:1; background:transparent; border: 2px solid var(--blood-wine); color: white;" onclick="window.viewUserProfile('${can.uid}')">PERFIL</button>
                    </div>
                </div>`;
        });
    }
}

export function updateUserInterface(isLoggedIn) {
    const userArea = document.getElementById('user-area');
    if (!userArea) return;

    if (isLoggedIn && currentUserDoc) {
        const isEmployer = currentUserDoc.exp === undefined;
        const nameToShow = isEmployer ? (currentUserDoc.name || 'Empresa') : (currentUserDoc.name ? currentUserDoc.name.split(' ')[0] : 'Usuário');
        userArea.innerHTML = `<a href="#profile" class="user-greeting strong-txt" style="margin-right:15px; text-decoration:none;">Olá, ${nameToShow}</a> <button class="login-btn" onclick="window.logout()">SAIR</button>`;
    } else {
        userArea.innerHTML = `<a href="#auth" class="login-btn-link"><button class="login-btn">LOGIN</button></a>`;
    }
}

window.updateUserInterface = updateUserInterface;

window.togglePasswordVisibility = (inputId, iconEl) => {
    const input = document.getElementById(inputId);
    if (input) {
        if (input.type === 'password') {
            input.type = 'text';
            iconEl.classList.remove('fa-eye');
            iconEl.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            iconEl.classList.remove('fa-eye-slash');
            iconEl.classList.add('fa-eye');
        }
    }
};

window.loadJobToEdit = (jobId) => {
    if (!currentUserDoc || !currentUserDoc.jobs) return;
    const job = currentUserDoc.jobs.find(j => j.id === jobId);
    if (job) {
        document.getElementById('edit-job-id').value = job.id;
        document.getElementById('edit-job-role').value = job.role || '';
        document.getElementById('edit-job-salary').value = job.salary || '';
        document.getElementById('edit-job-type').value = job.type || 'CLT';
        document.getElementById('edit-job-location').value = job.location || '';
        document.getElementById('edit-job-desc').value = job.desc || '';
        document.getElementById('edit-job-work-start').value = job.workStart || '';
        document.getElementById('edit-job-work-lunch').value = job.workLunch || '';
        document.getElementById('edit-job-work-end').value = job.workEnd || '';
    }
};

// Add DOMContentLoaded listener check or direct init for edit-job form submit
const initEditJobForm = () => {
    const formEditJob = document.getElementById('form-edit-job');
    if (formEditJob) {
        formEditJob.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-submit-edit-job');
            btn.innerText = "SALVANDO...";
            try {
                const id = document.getElementById('edit-job-id').value;
                const index = currentUserDoc.jobs.findIndex(j => j.id === id);
                if (index !== -1) {
                    currentUserDoc.jobs[index] = {
                        ...currentUserDoc.jobs[index],
                        role: document.getElementById('edit-job-role').value,
                        salary: document.getElementById('edit-job-salary').value,
                        type: document.getElementById('edit-job-type').value,
                        location: document.getElementById('edit-job-location').value,
                        desc: document.getElementById('edit-job-desc').value,
                        workStart: document.getElementById('edit-job-work-start').value,
                        workLunch: document.getElementById('edit-job-work-lunch').value,
                        workEnd: document.getElementById('edit-job-work-end').value,
                    };

                    const { error } = await supabase
                        .from('companies')
                        .update({ jobs: currentUserDoc.jobs })
                        .eq('id', currentUserDoc.uid);

                    if (error) throw error;
                    window.showToast("Vaga atualizada com sucesso!", 'success');
                    window.location.hash = "#edit-profile";
                }
            } catch(e) {
                console.error(e);
                window.showToast("Erro ao salvar vaga.", 'error');
            } finally {
                btn.innerText = "SALVAR VAGA";
            }
        });
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEditJobForm);
} else {
    initEditJobForm();
}
