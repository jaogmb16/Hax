// js/chat.js
import { supabase } from './supabase.js';
import { currentAuthUser, currentUserDoc } from './auth.js';

let currentChatId = null;
let currentContactName = "";
let chatSubscription = null;
let messagesSubscription = null;

export function clearActiveChat() {
    currentChatId = null;
    currentContactName = "";
    if (messagesSubscription) {
        supabase.removeChannel(messagesSubscription);
        messagesSubscription = null;
    }
    
    // Hide chat window elements
    const header = document.getElementById('chat-header');
    if (header) header.classList.add('hidden-view');
    
    const inputArea = document.getElementById('chat-input-area');
    if (inputArea) inputArea.classList.add('hidden-view');
    
    const messagesArea = document.getElementById('messages-area');
    if (messagesArea) {
        messagesArea.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-comments" style="font-size: 3rem; margin-bottom: 20px; opacity: 0.3;"></i>
                <p>Selecione um contato ao lado para conversar.</p>
            </div>
        `;
    }
    
    // On mobile, ensure the sidebar is visible (not closed)
    const sidebar = document.getElementById('chat-sidebar');
    if (sidebar) sidebar.classList.remove('closed');
}

export function loadUserChats() {
    if (!currentAuthUser) return;

    const chatListDiv = document.getElementById('chat-list');
    if (!chatListDiv) return;
    chatListDiv.innerHTML = '<div style="padding:15px; color:#666;">Carregando conversas...</div>';

    // Clear active chat when entering the chat section generally
    clearActiveChat();

    // Cancela listener anterior se existir
    if (chatSubscription) {
        supabase.removeChannel(chatSubscription);
        chatSubscription = null;
    }

    // Busca inicial de todas mensagens do usuário
    async function fetchAndRender() {
        const { data: messages, error } = await supabase
            .from('messages')
            .select('*')
            .like('chat_id', `%${currentAuthUser.id}%`)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Erro ao buscar conversas:", error);
            return;
        }

        let userChats = {};

        (messages || []).forEach(msg => {
            if (msg.chat_id && msg.chat_id.includes(currentAuthUser.id)) {
                let parts = msg.chat_id.split('_');
                let contactUid = parts[0] === currentAuthUser.id ? parts[1] : parts[0];

                const msgTime = new Date(msg.created_at).getTime();

                if (!userChats[contactUid] || userChats[contactUid].time < msgTime) {
                    userChats[contactUid] = {
                        contactName: "Contato",
                        text: msg.text,
                        time: msgTime,
                        senderUid: msg.sender_uid
                    };
                }
            }
        });

        const contactUids = Object.keys(userChats);
        if (contactUids.length > 0) {
            const [candidatesRes, companiesRes] = await Promise.all([
                supabase.from('candidates').select('id, name').in('id', contactUids),
                supabase.from('companies').select('id, name').in('id', contactUids)
            ]);
            const nameMap = {};
            (candidatesRes.data || []).forEach(c => { nameMap[c.id] = c.name; });
            (companiesRes.data || []).forEach(c => { nameMap[c.id] = c.name; });
            Object.keys(userChats).forEach(uid => {
                if (nameMap[uid]) userChats[uid].contactName = nameMap[uid];
            });
        }

        // Add current active chat as a temporary contact if it doesn't have messages yet
        if (currentChatId && currentContactName) {
            let parts = currentChatId.split('_');
            let contactUid = parts.find(id => id !== currentAuthUser.id);
            if (contactUid && !userChats[contactUid]) {
                userChats[contactUid] = {
                    contactName: currentContactName,
                    text: "(Nova conversa)",
                    time: Date.now() + 100000,
                    senderUid: ""
                };
            }
        }

        let chatArray = Object.keys(userChats).map(contactUid => {
            return { contactUid: contactUid, ...userChats[contactUid] };
        });
        chatArray.sort((a, b) => b.time - a.time);

        chatListDiv.innerHTML = '';
        if (chatArray.length === 0) {
            chatListDiv.innerHTML = '<div style="padding:15px; color:#666;">Você ainda não tem conversas.</div>';
            return;
        }

        chatArray.forEach(chat => {
            const isMe = chat.senderUid === currentAuthUser.id ? 'Você: ' : '';
            
            // Check if there are new unread messages
            const activeContactUid = currentChatId ? currentChatId.split('_').find(id => id !== currentAuthUser.id) : null;
            const lastRead = parseInt(localStorage.getItem(`chat_last_read_${currentAuthUser.id}_${chat.contactUid}`) || '0');
            const hasNew = (chat.senderUid !== currentAuthUser.id) && (chat.time > lastRead) && (chat.contactUid !== activeContactUid);
            
            const redDot = hasNew ? `<span class="unread-dot" style="width: 8px; height: 8px; background-color: #ff3b30; border-radius: 50%; display: inline-block; margin-left: 8px;"></span>` : '';

            chatListDiv.innerHTML += `
                <div class="chat-contact" onclick="window.openChat('${chat.contactUid}', '${chat.contactName}')">
                    <div style="flex:1;">
                        <div class="contact-name">${chat.contactName} ${redDot}</div>
                        <div class="last-msg" style="${hasNew ? 'font-weight: bold; color: white;' : ''}">${isMe}${chat.text}</div>
                    </div>
                </div>
            `;
        });
    }

    fetchAndRender();

    // Listener em tempo real para novas mensagens
    chatSubscription = supabase
        .channel('chat-list-updates')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'messages'
            },
            (payload) => {
                if (payload.new.chat_id && payload.new.chat_id.includes(currentAuthUser.id)) {
                    fetchAndRender();
                }
            }
        )
        .subscribe();
}

export async function sendMessage() {
    const input = document.getElementById('message-input');
    const text = input.value.trim();
    if (!text || !currentAuthUser || !currentChatId) return;

    input.value = ''; // Clear immediately to prevent duplicate sends

    try {
        const { error } = await supabase
            .from('messages')
            .insert({
                sender_uid: currentAuthUser.id,
                sender_name: currentUserDoc?.name || "Usuário",
                receiver_name: currentContactName,
                text: text,
                chat_id: currentChatId
            });

        if (error) throw error;
        input.focus();
    } catch (error) {
        console.error("Erro ao enviar mensagem:", error);
        input.value = text; // Restore text on failure
    }
}

export function openChat(contactUid, contactName) {
    if (!currentAuthUser) return;

    currentContactName = contactName;
    currentChatId = [currentAuthUser.id, contactUid].sort().join("_");

    const sidebar = document.getElementById('chat-sidebar');
    if (sidebar) {
        sidebar.classList.add('closed');
    }

    document.getElementById('chat-header').classList.remove('hidden-view');
    document.getElementById('chat-title-name').innerText = contactName;
    document.getElementById('chat-input-area').classList.remove('hidden-view');

    const messagesArea = document.getElementById('messages-area');
    messagesArea.innerHTML = '<div style="padding: 20px; color: #666; text-align: center;">Carregando mensagens...</div>';

    // Cancela listener anterior
    if (messagesSubscription) {
        supabase.removeChannel(messagesSubscription);
        messagesSubscription = null;
    }

    // Mark as read in localStorage
    localStorage.setItem(`chat_last_read_${currentAuthUser.id}_${contactUid}`, Date.now().toString());

    // Busca mensagens existentes
    async function fetchMessages() {
        const { data: msgs, error } = await supabase
            .from('messages')
            .select('*')
            .eq('chat_id', currentChatId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error("Erro ao carregar mensagens:", error);
            messagesArea.innerHTML = '<p style="color: red; text-align: center;">Erro ao carregar o chat.</p>';
            return;
        }

        messagesArea.innerHTML = '';
        
        // Update read status as messages load while viewing
        localStorage.setItem(`chat_last_read_${currentAuthUser.id}_${contactUid}`, Date.now().toString());

        if (!msgs || msgs.length === 0) {
            messagesArea.innerHTML = '<div class="empty-state"><p>Envie a primeira mensagem!</p></div>';
            return;
        }

        msgs.forEach(msg => {
            const type = msg.sender_uid === currentAuthUser.id ? 'sent' : 'received';
            addBubble(msg.text, type);
        });
    }

    fetchMessages();

    // Listener em tempo real para mensagens DESTE chat
    messagesSubscription = supabase
        .channel(`chat-${currentChatId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `chat_id=eq.${currentChatId}`
            },
            (payload) => {
                const msg = payload.new;
                
                // Update read status
                localStorage.setItem(`chat_last_read_${currentAuthUser.id}_${contactUid}`, Date.now().toString());

                const type = msg.sender_uid === currentAuthUser.id ? 'sent' : 'received';
                const empty = messagesArea.querySelector('.empty-state');
                if (empty) empty.remove();
                addBubble(msg.text, type);
            }
        )
        .subscribe();
}

function addBubble(text, type) {
    const area = document.getElementById('messages-area');
    if (!area) return;
    const div = document.createElement('div');
    div.className = `message ${type}`;
    div.innerHTML = `${text}`;
    area.appendChild(div);
    area.scrollTop = area.scrollHeight;
}
