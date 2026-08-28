import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Validate whether real Supabase credentials are configured
export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://your-project.supabase.co' &&
  !supabaseUrl.includes('your-project') &&
  supabaseAnonKey !== 'your-supabase-anon-key'
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        fetch: (url, options) => {
          const token = localStorage.getItem('nexa_token');
          const headers = new Headers(options?.headers);
          if (token) {
            headers.set('Authorization', `Bearer ${token}`);
          }
          return fetch(url, { ...options, headers });
        }
      }
    })
  : null;

/**
 * Look up doctor email by doctor_id, license_number, or email
 */
export async function lookupDoctorEmail(identifier: string): Promise<string | null> {
  if (!supabase || !isSupabaseConfigured) return null;
  const cleanId = identifier.trim();

  // If already an email, return directly
  if (cleanId.includes('@')) {
    return cleanId;
  }

  try {
    const { data, error } = await supabase
      .from('doctors')
      .select('email, doctor_id, license_number')
      .or(`doctor_id.ilike.${cleanId},license_number.ilike.${cleanId}`)
      .limit(1)
      .maybeSingle();

    if (!error && data?.email) {
      return data.email;
    }
  } catch (err) {
    console.warn('Doctor lookup error in Supabase:', err);
  }

  return null;
}

/**
 * Fetch true user profile from Supabase PostgreSQL `profiles` table
 */
export async function fetchDbProfile(userId: string) {
  if (!supabase || !isSupabaseConfigured) return null;

  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`id.eq.${userId},user_id.eq.${userId}`)
      .maybeSingle();

    if (error) {
      console.warn('Error fetching profile from Supabase:', error);
      return null;
    }
    return profile;
  } catch (err) {
    console.warn('Error executing profile query:', err);
    return null;
  }
}

/**
 * Fetch doctor verification status & details from `doctors` table
 */
export async function fetchDbDoctor(userId: string) {
  if (!supabase || !isSupabaseConfigured) return null;

  try {
    const { data: doctor, error } = await supabase
      .from('doctors')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Error fetching doctor record from Supabase:', error);
      return null;
    }
    return doctor;
  } catch (err) {
    console.warn('Error executing doctor query:', err);
    return null;
  }
}

/**
 * Fetch patient details from `patients` table
 */
export async function fetchDbPatient(userId: string) {
  if (!supabase || !isSupabaseConfigured) return null;

  try {
    const { data: patient, error } = await supabase
      .from('patients')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Error fetching patient record from Supabase:', error);
      return null;
    }
    return patient;
  } catch (err) {
    console.warn('Error executing patient query:', err);
    return null;
  }
}
