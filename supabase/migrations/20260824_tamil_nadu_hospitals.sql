-- Tamil Nadu Complete 38 District Hospital Directory Migration
-- Schema for districts, hospitals, and performance indexes

CREATE TABLE IF NOT EXISTS public.tamil_nadu_districts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    state VARCHAR(50) NOT NULL DEFAULT 'Tamil Nadu',
    country VARCHAR(50) NOT NULL DEFAULT 'India',
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert all 38 official districts of Tamil Nadu
INSERT INTO public.tamil_nadu_districts (name, latitude, longitude) VALUES
('Ariyalur', 11.1400, 79.0786),
('Chengalpattu', 12.6841, 79.9836),
('Chennai', 13.0827, 80.2707),
('Coimbatore', 11.0168, 76.9558),
('Cuddalore', 11.7480, 79.7714),
('Dharmapuri', 12.1211, 78.1582),
('Dindigul', 10.3673, 77.9803),
('Erode', 11.3410, 77.7172),
('Kallakurichi', 11.7383, 78.9639),
('Kancheepuram', 12.8342, 79.7036),
('Karur', 10.9601, 78.0766),
('Krishnagiri', 12.5186, 78.2137),
('Madurai', 9.9252, 78.1198),
('Mayiladuthurai', 11.1075, 79.6522),
('Nagapattinam', 10.7672, 79.8449),
('Kanniyakumari', 8.0883, 77.5385),
('Namakkal', 11.2189, 78.1674),
('Perambalur', 11.2342, 78.8814),
('Pudukottai', 10.3833, 78.8001),
('Ramanathapuram', 9.3639, 78.8395),
('Ranipet', 12.9272, 79.3330),
('Salem', 11.6643, 78.1460),
('Sivaganga', 9.8433, 78.4809),
('Tenkasi', 8.9594, 77.3152),
('Thanjavur', 10.7870, 79.1378),
('Theni', 10.0104, 77.4768),
('Thoothukudi', 8.7642, 78.1348),
('Tiruchirappalli', 10.7905, 78.7047),
('Tirunelveli', 8.7139, 77.7567),
('Tirupathur', 12.4925, 78.5678),
('Tiruppur', 11.1085, 77.3411),
('Tiruvallur', 13.1432, 79.9079),
('Tiruvannamalai', 12.2253, 79.0747),
('Tiruvarur', 10.7725, 79.6365),
('Vellore', 12.9165, 79.1325),
('Viluppuram', 11.9401, 79.4861),
('Virudhunagar', 9.5872, 77.9579),
('The Nilgiris', 11.4102, 76.6950)
ON CONFLICT (name) DO NOTHING;

-- Extend hospitals table if not already present
ALTER TABLE public.hospitals 
ADD COLUMN IF NOT EXISTS hospital_type VARCHAR(50) DEFAULT 'Multi-Speciality Hospital',
ADD COLUMN IF NOT EXISTS district VARCHAR(100),
ADD COLUMN IF NOT EXISTS district_id UUID REFERENCES public.tamil_nadu_districts(id),
ADD COLUMN IF NOT EXISTS emergency_phone VARCHAR(30),
ADD COLUMN IF NOT EXISTS facilities TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Performance Indexes for search & filtering
CREATE INDEX IF NOT EXISTS idx_hospitals_district ON public.hospitals(district);
CREATE INDEX IF NOT EXISTS idx_hospitals_city ON public.hospitals(city);
CREATE INDEX IF NOT EXISTS idx_hospitals_hospital_type ON public.hospitals(hospital_type);
CREATE INDEX IF NOT EXISTS idx_hospitals_is_active ON public.hospitals(is_active);
CREATE INDEX IF NOT EXISTS idx_hospitals_emergency ON public.hospitals(emergency_available);

-- Enable RLS
ALTER TABLE public.tamil_nadu_districts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Tamil Nadu Districts" ON public.tamil_nadu_districts;
CREATE POLICY "Public Read Tamil Nadu Districts" 
ON public.tamil_nadu_districts FOR SELECT 
USING (true);
