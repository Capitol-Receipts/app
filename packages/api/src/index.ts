// Supabase queries shared by web and (later) the Expo app: createApi(client) so each app passes its own client.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@cr/shared';

export function createApi(db: SupabaseClient<Database>) {
  return {
    member: (id: string) => db.from('members').select('*').eq('id', id).maybeSingle(),
    appMeta: (key: string) => db.from('app_meta').select('value').eq('key', key).maybeSingle(),
    myPrefs: () => db.from('user_prefs').select('*').maybeSingle(),
  };
}
export type Api = ReturnType<typeof createApi>;
