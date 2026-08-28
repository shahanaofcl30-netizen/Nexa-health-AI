import { Router } from 'express';
const supabase = null; // Removed supabase

const router = Router();

// GET /api/health/db - Verify database connectivity
router.get('/db', async (_req, res) => {
  try {
    if (!supabase) {
      throw new Error('Supabase client not configured');
    }
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const { data, error } = await ({} as any).from('profiles').select('id').limit(1);
    let isConnected = false;
    let details = '';

    if (error) {
      console.error('DB health check query returned error:', error);
      // PGRST205 means connection is successful but the database is empty (no tables)
      if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        isConnected = true;
        details = 'Connected to Supabase, but schema migrations have not been applied yet (public.profiles not found).';
      } else {
        throw error;
      }
    } else {
      isConnected = true;
      details = 'Database connection fully operational and profiles table exists.';
    }

    res.json({ 
      status: 'ok', 
      connected: isConnected,
      message: 'Database connection successful', 
      details,
      rowsReturned: data?.length ?? 0 
    });
  } catch (err: any) {
    const message = err?.message || 'Unknown error';
    console.error('DB health check failed:', err);
    res.status(500).json({ status: 'error', error: message, details: err });
  }
});

export default router;
