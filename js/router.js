import { currentAuthUser } from './auth.js';
import { loadUserChats } from './chat.js';
import { loadUserProfile, loadEditProfile } from './profile.js';
import { renderLists } from './main.js';

export function handleRoute() {
    let hash = window.location.hash || '#home';
    let [pathMatch, query] = hash.split('?');
    const pageId = pathMatch.replace('#', '');
    const urlParams = new URLSearchParams(query || '');
    const filterType = urlParams.get('filter') || 'all';
    
    document.querySelectorAll('.page-content').forEach(page => page.classList.add('hidden'));
    
    if (pageId === 'home') {
        const hs = document.getElementById('home-screen');
        if(hs) hs.classList.remove('hidden');
        const bb = document.getElementById('back-btn');
        if(bb) bb.classList.add('hidden');
    } else {
        const hs = document.getElementById('home-screen');
        if(hs) hs.classList.add('hidden');
        const bb = document.getElementById('back-btn');
        if(bb) bb.classList.remove('hidden');

        const targetPage = document.getElementById(`${pageId}-page`);
        if (targetPage) targetPage.classList.remove('hidden');
    }

    if (pageId === 'companies' || pageId === 'employees') {
        renderLists(filterType);
    }
    
    if (pageId === 'chat') {
        if (!currentAuthUser) {
            window.showToast("Você precisa fazer login para acessar esta página.", 'info');
            // Usa replaceState para não empilhar no histórico e evitar loop do botão voltar
            history.replaceState(null, '', '#auth');
            handleRoute();
            return;
        }
        loadUserChats();
    }
    
    if (pageId === 'profile') {
        const uidToView = window.targetProfileUid || (currentAuthUser ? currentAuthUser.id : null);
        if(!uidToView) {
             window.showToast("Faça login para poder ver o seu próprio perfil.", 'info');
             history.replaceState(null, '', '#auth');
             handleRoute();
             return;
        }
        loadUserProfile(uidToView);
        window.targetProfileUid = null; // limpa o alvo para as proximas leituras caírem de volta no perfil próprio
    }

    if (pageId === 'edit-profile') {
        if(!currentAuthUser) {
             history.replaceState(null, '', '#auth');
             handleRoute();
             return;
        }
        loadEditProfile();
    }

    if (pageId === 'add-job') {
        if(!currentAuthUser) {
             history.replaceState(null, '', '#auth');
             handleRoute();
             return;
        }
        const f = document.getElementById('form-add-job');
        if(f) f.reset();
    }

    if (pageId === 'edit-job') {
        if(!currentAuthUser) {
             history.replaceState(null, '', '#auth');
             handleRoute();
             return;
        }
        const jobId = urlParams.get('id');
        window.loadJobToEdit?.(jobId);
    }
    
    window.scrollTo(0, 0);
}

export function initRouter() {
    window.addEventListener('hashchange', handleRoute);
    handleRoute(); // Call on initial load
}

export function goBack() {
    if (window.history.length > 2) {
        window.history.back();
    } else {
        window.location.hash = "#home";
    }
}
window.goBack = goBack;
