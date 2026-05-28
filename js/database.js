// js/database.js
import { supabase } from './supabase.js';

export async function getCompanies() {
    try {
        const { data, error } = await supabase
            .from('companies')
            .select('*');

        if (error) throw error;

        // Mapeia id → uid para manter compatibilidade com o resto do código
        return (data || []).map(row => ({ uid: row.id, ...row }));
    } catch (e) {
        console.error("Error fetching companies:", e);
        return [];
    }
}

export async function getCandidates() {
    try {
        const { data, error } = await supabase
            .from('candidates')
            .select('*');

        if (error) throw error;

        return (data || []).map(row => ({ uid: row.id, ...row }));
    } catch (e) {
        console.error("❌ Error fetching candidates:", e);
        return [];
    }
}
