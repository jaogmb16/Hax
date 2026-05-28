// js/auth.js
import { supabase } from './supabase.js';

export let currentUserDoc = null;
export let currentAuthUser = null;

export function initAuth() {
    // Escuta mudanças de sessão (login/logout)
    supabase.auth.onAuthStateChange((event, session) => {
        if (session && session.user) {
            currentAuthUser = session.user;

            // CRÍTICO: defer as chamadas supabase pra fora do callback
            // (evita deadlock do Supabase v2)
            setTimeout(async () => {
                let userData = null;

                let { data: companyData } = await supabase
                    .from('companies')
                    .select('*')
                    .eq('id', session.user.id)
                    .maybeSingle();

                if (companyData) {
                    userData = companyData;
                } else {
                    let { data: candidateData } = await supabase
                        .from('candidates')
                        .select('*')
                        .eq('id', session.user.id)
                        .maybeSingle();

                    if (candidateData) {
                        userData = candidateData;
                    }
                }

                if (userData) {
                    currentUserDoc = {
                        uid: session.user.id,
                        name: userData.name,
                        industry: userData.industry,
                        size: userData.size,
                        phone: userData.phone,
                        role: userData.role,
                        location: userData.location,
                        type: userData.type,
                        salary: userData.salary,
                        desc: userData.desc,
                        workStart: userData.workStart,
                        workLunch: userData.workLunch,
                        workEnd: userData.workEnd,
                        photo: userData.photo,
                        file: userData.file,
                        jobs: userData.jobs || [],
                        age: userData.age,
                        education: userData.education,
                        exp: userData.exp,
                        skill: userData.skill,
                        createdAt: userData.created_at
                    };
                } else {
                    currentUserDoc = { uid: session.user.id };
                }

                window.updateUserInterface?.(true);
            }, 0);
        } else {
            currentAuthUser = null;
            currentUserDoc = null;
            window.updateUserInterface?.(false);
        }
    });

    // Verifica se já há sessão ativa ao carregar
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            // O onAuthStateChange já vai disparar
        }
    });
}

export async function loginUser(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw error;

        window.location.hash = "#home";
        return true;
    } catch (error) {
        console.error("❌ ERRO NO LOGIN:", error);
        if (error.message && error.message.includes("Email not confirmed")) {
            window.showToast("Você precisa confirmar seu e-mail antes de entrar. Verifique sua caixa de entrada.", 'info');
        } else {
            window.showToast("Erro no login: " + error.message, 'error');
        }
        return false;
    }
}

export async function registerUser(email, password, profileData, type) {
    try {
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password
        });

        if (error) throw error;

        const user = data.user;
        if (!user) throw new Error("Usuário não retornado após cadastro.");

        const tableName = type === 'employer' ? 'companies' : 'candidates';

        const insertData = {
            id: user.id,
            ...profileData,
            created_at: new Date().toISOString()
        };

        if (type === 'employer') {
            insertData.jobs = [{
                id: Date.now().toString(),
                role: profileData.role,
                location: profileData.location,
                type: profileData.type,
                salary: profileData.salary,
                desc: profileData.desc,
                workStart: profileData.workStart || '',
                workLunch: profileData.workLunch || '',
                workEnd: profileData.workEnd || '',
                status: 'open'
            }];
        }

        const { error: insertError } = await supabase
            .from(tableName)
            .insert(insertData);

        if (insertError) throw insertError;

        // Resto do código (popular currentUserDoc, alert, etc.) — deixa igual estava
        currentUserDoc = {
            uid: user.id,
            name: insertData.name,
            industry: insertData.industry,
            size: insertData.size,
            phone: insertData.phone,
            role: insertData.role,
            location: insertData.location,
            type: insertData.type,
            salary: insertData.salary,
            desc: insertData.desc,
            photo: insertData.photo,
            file: insertData.file,
            jobs: insertData.jobs || [],
            age: insertData.age,
            education: insertData.education,
            exp: insertData.exp,
            skill: insertData.skill,
            createdAt: insertData.created_at
        };
        window.updateUserInterface?.(true);

        window.showToast('Sua conta foi criada com sucesso! Você já está logado.', 'success');
        window.location.hash = "#profile";
        return user;
    } catch (error) {
        console.error("❌ ERRO AO CRIAR CONTA:", error);
        window.showToast("Erro ao criar conta: " + error.message, 'error');
        return false;
    }
}

export async function logoutUser() {
    try {
        await supabase.auth.signOut();
        window.location.hash = "#home";
    } catch (error) {
        console.error("Erro ao sair", error);
    }
}
