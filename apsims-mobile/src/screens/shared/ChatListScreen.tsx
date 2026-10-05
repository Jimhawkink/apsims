/**
 * APSIMS ChatListScreen — WhatsApp-exact premium contacts list
 * Shows CONTACTS (people) not groups — tap to open direct chat
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    TextInput, ActivityIndicator, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSession } from '../../context/SessionContext';
import { supabase } from '../../lib/supabase';

interface Contact {
    id: number;
    full_name: string;
    username: string;
    role: string;
    lastMessage?: string;
    lastTime?: string;
    unread: number;
}

function roomKey(a: number, b: number) {
    return `direct_${Math.min(a, b)}_${Math.max(a, b)}`;
}

function fmtTime(ts: string) {
    if (!ts) return '';
    const d = new Date(ts);
    const diff = Date.now() - d.getTime();
    if (diff < 86400000) return d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
    if (diff < 604800000) return d.toLocaleDateString('en-KE', { weekday: 'short' });
    return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
}

const ROLE_COLOR: Record<string, string> = {
    admin: '#6366f1', principal: '#7c3aed', teacher: '#0d9488',
    bursar: '#d97706', parent: '#059669', student: '#2563eb',
};
const ROLE_ORDER = ['admin', 'principal', 'teacher', 'bursar', 'parent', 'student'];
const ROLE_LABEL: Record<string, string> = {
    admin: '🔑 Admins', principal: '🎓 Principals', teacher: '👨‍🏫 Teachers',
    bursar: '💰 Bursars', parent: '👨‍👩‍👧 Parents', student: '🎒 Students',
};

function rc(role: string) { return ROLE_COLOR[role?.toLowerCase()] || '#6366f1'; }

function Avatar({ name, role, size = 50 }: { name: string; role?: string; size?: number }) {
    const ini = (name || '?').split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('');
    return (
        <LinearGradient
            colors={[rc(role || ''), rc(role || '') + 'aa']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: size * 0.36 }}>{ini}</Text>
        </LinearGradient>
    );
}

export default function ChatListScreen() {
    const { session } = useSession();
    const navigation = useNavigation();
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const loadContacts = useCallback(async () => {
        if (!session?.portal_user_id) return;
        setLoading(true);

        // ── PARENT: skip contacts list, go straight to school admin ──────────
        if (session.user_type === 'parent' || session.role === 'parent') {
            // Find the admin/principal for this school
            const { data: admins } = await supabase
                .from('school_users')
                .select('id, full_name, username, role, phone')
                .in('role', ['admin', 'principal'])
                .order('role')
                .limit(1);

            const admin = admins?.[0];
            if (admin) {
                const key = roomKey(session.portal_user_id, admin.id);
                let { data: room } = await supabase
                    .from('school_chat_rooms').select('id')
                    .eq('room_name', key).maybeSingle();

                if (!room) {
                    const { data: nr } = await supabase
                        .from('school_chat_rooms')
                        .insert([{ room_type: 'direct', room_name: key, is_active: true, created_by: session.portal_user_id }])
                        .select('id').single();
                    room = nr;
                }

                if (room?.id) {
                    setLoading(false);
                    // Navigate directly to chat room — parent has no contacts list
                    (navigation as any).replace('ChatRoom', {
                        room: { id: room.id, room_type: 'direct', room_name: key },
                        contact: { id: admin.id, full_name: admin.full_name, role: admin.role },
                        isParentDirectInbox: true,
                    });
                    return;
                }
            }
            setLoading(false);
            return;
        }

        // ── ALL OTHER ROLES: load full contacts list ───────────────────────


        const { data } = await supabase
            .from('school_users')
            .select('id, full_name, username, role')
            .neq('id', session.portal_user_id)
            .order('role').order('full_name');

        if (!data) { setLoading(false); return; }

        // Fetch last message for each contact
        const enriched: Contact[] = await Promise.all(data.map(async (u: any) => {
            const key = roomKey(session.portal_user_id, u.id);
            const { data: room } = await supabase
                .from('school_chat_rooms').select('id')
                .eq('room_name', key).maybeSingle();
            let lastMessage = '', lastTime = '', unread = 0;
            if (room?.id) {
                const { data: msgs } = await supabase
                    .from('school_chat_messages')
                    .select('message, created_at, sender_id, read_by')
                    .eq('room_id', room.id).eq('is_deleted', false)
                    .order('created_at', { ascending: false }).limit(1);
                if (msgs?.[0]) {
                    lastMessage = msgs[0].message?.slice(0, 55) || '';
                    lastTime = fmtTime(msgs[0].created_at);
                    if (msgs[0].sender_id !== session.portal_user_id &&
                        !(msgs[0].read_by || []).includes(session.portal_user_id)) {
                        unread = 1;
                    }
                }
            }
            return { ...u, lastMessage, lastTime, unread };
        }));

        setContacts(enriched);
        setLoading(false);
    }, [session?.portal_user_id]);

    useEffect(() => { loadContacts(); }, [loadContacts]);

    const openChat = useCallback(async (contact: Contact) => {
        if (!session?.portal_user_id) return;
        const key = roomKey(session.portal_user_id, contact.id);

        let { data: room } = await supabase
            .from('school_chat_rooms').select('id')
            .eq('room_name', key).maybeSingle();

        if (!room) {
            const { data: nr } = await supabase
                .from('school_chat_rooms')
                .insert([{ room_type: 'direct', room_name: key, is_active: true, created_by: session.portal_user_id }])
                .select('id').single();
            room = nr;
        }

        if (!room?.id) return;
        // Mark as read
        setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, unread: 0 } : c));

        (navigation as any).navigate('ChatRoom', {
            room: { id: room.id, room_type: 'direct', room_name: key },
            contact: { id: contact.id, full_name: contact.full_name, role: contact.role },
        });
    }, [session, navigation]);

    const filtered = contacts.filter(c =>
        !search || c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        c.role?.toLowerCase().includes(search.toLowerCase())
    );

    // Group by role
    const grouped: Record<string, Contact[]> = {};
    filtered.forEach(c => {
        const g = c.role?.toLowerCase() || 'other';
        if (!grouped[g]) grouped[g] = [];
        grouped[g].push(c);
    });
    const sections: { title: string; data: Contact[] }[] = ROLE_ORDER
        .filter(r => grouped[r]?.length)
        .map(r => ({ title: ROLE_LABEL[r] || r, data: grouped[r] }));

    return (
        <View style={S.root}>
            <StatusBar barStyle="dark-content" backgroundColor="#f0f2f5" />

            {/* Header */}
            <View style={S.header}>
                <View>
                    <Text style={S.headerTitle}>School Chat</Text>
                    <Text style={S.headerSub}>{session?.full_name}</Text>
                </View>
                <View style={S.headerRight}>
                    <Text style={{ fontSize: 20 }}>💬</Text>
                </View>
            </View>

            {/* Search */}
            <View style={S.searchWrap}>
                <View style={S.searchBox}>
                    <Text style={{ fontSize: 14, marginRight: 6 }}>🔍</Text>
                    <TextInput
                        value={search}
                        onChangeText={setSearch}
                        placeholder="Search contacts…"
                        placeholderTextColor="#adb5bd"
                        style={S.searchInput}
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <Text style={{ fontSize: 14, color: '#adb5bd' }}>✕</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {loading ? (
                <View style={S.center}>
                    <ActivityIndicator size="large" color="#128C7E" />
                    <Text style={S.loadTxt}>Loading contacts…</Text>
                </View>
            ) : contacts.length === 0 ? (
                <View style={S.center}>
                    <Text style={{ fontSize: 52 }}>👥</Text>
                    <Text style={S.loadTxt}>No contacts yet</Text>
                    <Text style={{ color: '#adb5bd', fontSize: 12, textAlign: 'center', marginTop: 4, paddingHorizontal: 32 }}>
                        Contacts appear here once users are added to the school system
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={sections}
                    keyExtractor={item => item.title}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item: section }) => (
                        <View>
                            {/* Section label */}
                            <View style={S.sectionHeader}>
                                <Text style={S.sectionTitle}>{section.title}</Text>
                            </View>

                            {section.data.map(contact => (
                                <TouchableOpacity
                                    key={contact.id}
                                    onPress={() => openChat(contact)}
                                    activeOpacity={0.7}
                                    style={S.contactRow}
                                >
                                    {/* Avatar */}
                                    <View style={{ position: 'relative' }}>
                                        <Avatar name={contact.full_name} role={contact.role} size={52} />
                                    </View>

                                    {/* Info */}
                                    <View style={S.contactInfo}>
                                        <View style={S.contactTop}>
                                            <Text style={S.contactName} numberOfLines={1}>
                                                {contact.full_name}
                                            </Text>
                                            {contact.lastTime ? (
                                                <Text style={[S.contactTime, contact.unread > 0 && { color: '#25D366', fontWeight: '700' }]}>
                                                    {contact.lastTime}
                                                </Text>
                                            ) : null}
                                        </View>
                                        <View style={S.contactBottom}>
                                            <Text style={S.contactLast} numberOfLines={1}>
                                                {contact.lastMessage ||
                                                    <Text style={{ color: '#adb5bd', fontStyle: 'italic', fontSize: 13 }}>Tap to start chatting</Text>
                                                }
                                            </Text>
                                            {contact.unread > 0 && (
                                                <View style={S.badge}>
                                                    <Text style={S.badgeTxt}>{contact.unread}</Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                />
            )}
        </View>
    );
}

const S = StyleSheet.create({
    root:          { flex: 1, backgroundColor: '#fff' },
    header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#f0f2f5', borderBottomWidth: 1, borderBottomColor: '#e9edef' },
    headerTitle:   { fontSize: 20, fontWeight: '900', color: '#111b21' },
    headerSub:     { fontSize: 12, color: '#128C7E', fontWeight: '700', marginTop: 1 },
    headerRight:   { flexDirection: 'row', gap: 8 },
    searchWrap:    { padding: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f2f5' },
    searchBox:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f2f5', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
    searchInput:   { flex: 1, fontSize: 15, color: '#111b21' },
    center:        { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingBottom: 60 },
    loadTxt:       { fontSize: 14, color: '#667781', marginTop: 8 },
    sectionHeader: { paddingHorizontal: 16, paddingVertical: 6, backgroundColor: '#f9fafb', borderBottomWidth: 1, borderBottomColor: '#f0f2f5' },
    sectionTitle:  { fontSize: 11, fontWeight: '800', color: '#128C7E', letterSpacing: 0.7, textTransform: 'uppercase' },
    contactRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f2f5', gap: 14 },
    contactInfo:   { flex: 1 },
    contactTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 },
    contactName:   { fontSize: 16, fontWeight: '700', color: '#111b21', flex: 1, marginRight: 6 },
    contactTime:   { fontSize: 11, color: '#667781' },
    contactBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    contactLast:   { fontSize: 13, color: '#667781', flex: 1, marginRight: 6 },
    badge:         { width: 20, height: 20, borderRadius: 10, backgroundColor: '#25D366', alignItems: 'center', justifyContent: 'center' },
    badgeTxt:      { fontSize: 10, fontWeight: '900', color: '#fff' },
});
