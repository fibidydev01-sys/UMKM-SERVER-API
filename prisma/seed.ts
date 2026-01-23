import {
  PrismaClient,
  TenantStatus,
  OrderStatus,
  PaymentStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ==========================================
// UNSPLASH IMAGE URLS - HIGH QUALITY & FREE
// ==========================================
const IMAGES = {
  // Logo & Hero Background
  logo: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=200&h=200&fit=crop&q=80',
  heroBackground:
    'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=1200&h=400&fit=crop&q=80',

  // Burger Products
  burgerClassic:
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&h=600&fit=crop&q=80',
  burgerCheese:
    'https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&h=600&fit=crop&q=80',
  burgerDouble:
    'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=600&h=600&fit=crop&q=80',
  burgerBacon:
    'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=600&h=600&fit=crop&q=80',
  burgerChicken:
    'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=600&h=600&fit=crop&q=80',
  burgerSpicy:
    'https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=600&h=600&fit=crop&q=80',
  burgerMushroom:
    'https://images.unsplash.com/photo-1582196016295-f8c8bd4b3a99?w=600&h=600&fit=crop&q=80',
  burgerBBQ:
    'https://images.unsplash.com/photo-1599785209707-a456fc1337bb?w=600&h=600&fit=crop&q=80',

  // Sides
  frenchFries:
    'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&h=600&fit=crop&q=80',
  onionRings:
    'https://images.unsplash.com/photo-1639024471283-03518883512d?w=600&h=600&fit=crop&q=80',
  nuggets:
    'https://images.unsplash.com/photo-1562967914-608f82629710?w=600&h=600&fit=crop&q=80',
  mozzaStick:
    'https://images.unsplash.com/photo-1531749668029-2db88e4276c7?w=600&h=600&fit=crop&q=80',

  // Drinks
  cola: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&h=600&fit=crop&q=80',
  milkshake:
    'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&h=600&fit=crop&q=80',
  icedTea:
    'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&h=600&fit=crop&q=80',
  lemonade:
    'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=600&h=600&fit=crop&q=80',
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function generateOrderNumber(date: Date, index: number): string {
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
  const indexStr = String(index).padStart(3, '0');
  return `ORD-${dateStr}-${indexStr}`;
}

// ==========================================
// MAIN SEED
// ==========================================

async function main() {
  console.log('🍔 Starting Burger China Seed...\n');

  // Clean existing data
  console.log('🧹 Cleaning existing data...');
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.product.deleteMany();
  await prisma.tenant.deleteMany();
  console.log('✅ Database cleaned\n');

  const hashedPassword = await bcrypt.hash('password123', 10);

  // ==========================================
  // CREATE TENANT: BURGER CHINA
  // ==========================================
  console.log('🍔 Creating Tenant: Burger China...');

  const burgerChina = await prisma.tenant.create({
    data: {
      slug: 'burgerchina',
      name: 'Burger China',
      category: 'RESTORAN',
      description:
        'Burger premium dengan cita rasa Asia fusion. Bahan berkualitas, rasa juara!',
      whatsapp: '6281234567890',
      email: 'burgerchina@fibidy.com',
      phone: '081234567890',
      address: 'Jl. Asia Raya No. 88, Jakarta Pusat',
      logo: IMAGES.logo,
      password: hashedPassword,
      status: TenantStatus.ACTIVE,

      // Theme
      theme: {
        primaryColor: '#f97316', // Orange
      },

      // SEO Fields
      metaTitle: 'Burger China - Burger Premium Asia Fusion',
      metaDescription:
        'Nikmati burger premium dengan cita rasa Asia fusion. Bahan berkualitas, rasa juara! Pesan sekarang via WhatsApp.',
      socialLinks: {
        instagram: 'https://instagram.com/burgerchina',
        facebook: 'https://facebook.com/burgerchina',
        tiktok: 'https://tiktok.com/@burgerchina',
      },

      // ==========================================
      // STORE INFORMATION - PERMANENT DATA
      // Stored in tenant fields (not landingConfig)
      // ==========================================

      // Hero Data
      heroTitle: 'Burger Premium dengan Cita Rasa Asia Fusion',
      heroSubtitle:
        'Rasakan sensasi burger berkualitas dengan bumbu rahasia khas Asia. Dibuat fresh setiap hari dengan bahan-bahan pilihan.',
      heroCtaText: 'Pesan Sekarang',
      heroCtaLink: '/products',
      heroBackgroundImage: IMAGES.heroBackground,

      // About Data
      aboutTitle: 'Kenapa Burger China?',
      aboutSubtitle:
        'Kami percaya bahwa burger bukan sekadar makanan cepat saji',
      aboutContent:
        'Didirikan sejak 2019, Burger China hadir dengan konsep unik: memadukan kelezatan burger Amerika dengan sentuhan bumbu Asia. Setiap burger dibuat dengan daging sapi pilihan, roti homemade yang dipanggang sempurna, dan saus rahasia yang bikin ketagihan.\n\nKami menggunakan 100% daging segar tanpa pengawet, sayuran organik dari petani lokal, dan keju premium impor. Semua demi satu tujuan: memberikan pengalaman burger terbaik untuk Anda.',
      aboutImage: IMAGES.logo,
      aboutFeatures: [
        {
          icon: 'beef',
          title: 'Daging Premium',
          description: '100% daging sapi pilihan tanpa campuran',
        },
        {
          icon: 'leaf',
          title: 'Bahan Segar',
          description: 'Sayuran organik dari petani lokal',
        },
        {
          icon: 'flame',
          title: 'Fresh Grilled',
          description: 'Dipanggang fresh saat order',
        },
        {
          icon: 'award',
          title: 'Resep Rahasia',
          description: 'Bumbu Asia fusion yang unik',
        },
      ],

      // Testimonials Data
      testimonialsTitle: 'Kata Mereka',
      testimonialsSubtitle: 'Apa kata pelanggan tentang Burger China',
      testimonials: [
        {
          id: 't1',
          name: 'Budi Santoso',
          role: 'Food Blogger',
          content:
            'Ini burger terenak yang pernah saya coba di Jakarta! Pattynya juicy, sausnya unik banget. Wajib coba Double Dragon Burger!',
          rating: 5,
          avatar:
            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&q=80',
        },
        {
          id: 't2',
          name: 'Siti Rahayu',
          role: 'Office Worker',
          content:
            'Langganan order buat makan siang kantor. Delivery cepat, burger masih hangat, dan harganya worth it banget!',
          rating: 5,
          avatar:
            'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&q=80',
        },
        {
          id: 't3',
          name: 'Ahmad Rizki',
          role: 'Mahasiswa',
          content:
            'Porsinya gede, rasanya mantap, harga mahasiswa friendly. Spicy Dragon jadi favorit saya!',
          rating: 5,
          avatar:
            'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&q=80',
        },
        {
          id: 't4',
          name: 'Linda Chen',
          role: 'Ibu Rumah Tangga',
          content:
            'Anak-anak suka banget sama Chicken Teriyaki Burger-nya. Nggak terlalu pedas, cocok untuk keluarga.',
          rating: 5,
          avatar:
            'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&q=80',
        },
      ],

      // Contact Data
      contactTitle: 'Hubungi Kami',
      contactSubtitle:
        'Ada pertanyaan atau mau order dalam jumlah besar? Hubungi kami!',
      contactMapUrl: '',
      contactShowMap: false,
      contactShowForm: false,

      // CTA Data
      ctaTitle: 'Lapar? Pesan Sekarang!',
      ctaSubtitle:
        'Free delivery untuk area Jakarta Pusat. Minimal order Rp 50.000',
      ctaButtonText: 'Order via WhatsApp',
      ctaButtonLink: 'https://wa.me/6281234567890',
      ctaButtonStyle: 'primary',

      // ==========================================
      // LANDING CONFIG - BLOCK SELECTION ONLY
      // Data is stored in tenant fields above
      // ==========================================
      landingConfig: {
        template: 'modern-starter',
        hero: {
          enabled: true,
          block: 'hero1',
        },
        about: {
          enabled: true,
          block: 'about1',
        },
        products: {
          enabled: true,
          block: 'products1',
          config: {
            displayMode: 'featured',
            limit: 8,
            showViewAll: true,
          },
        },
        testimonials: {
          enabled: true,
          block: 'testimonials1',
        },
        contact: {
          enabled: true,
          block: 'contact1',
        },
        cta: {
          enabled: true,
          block: 'cta1',
        },
      },
    },
  });

  console.log(`✅ Tenant created: ${burgerChina.name} (${burgerChina.slug})`);

  // ==========================================
  // CREATE PRODUCTS
  // ==========================================
  console.log('\n🍔 Creating Products...');

  const products = await prisma.product.createMany({
    data: [
      // ========== SIGNATURE BURGERS ==========
      {
        tenantId: burgerChina.id,
        name: 'Classic China Burger',
        slug: 'classic-china-burger',
        description:
          'Burger klasik kami dengan patty daging sapi 150gr, selada segar, tomat, acar, bawang bombay, dan saus spesial China. Disajikan dengan roti brioche homemade.',
        category: 'Signature Burgers',
        sku: 'BRG-001',
        price: 45000,
        comparePrice: 55000,
        costPrice: 28000,
        stock: 100,
        minStock: 10,
        trackStock: true,
        unit: 'pcs',
        isActive: true,
        isFeatured: true,
        images: [IMAGES.burgerClassic],
        metadata: {
          weight: '250g',
          calories: 650,
          spicyLevel: 0,
          isHalal: true,
          preparationTime: 10,
        },
      },
      {
        tenantId: burgerChina.id,
        name: 'Double Dragon Burger',
        slug: 'double-dragon-burger',
        description:
          'Double patty 2x150gr dengan double cheese, bacon crispy, caramelized onion, dan dragon sauce yang creamy pedas. Best seller kami!',
        category: 'Signature Burgers',
        sku: 'BRG-002',
        price: 75000,
        comparePrice: 89000,
        costPrice: 45000,
        stock: 80,
        minStock: 10,
        trackStock: true,
        unit: 'pcs',
        isActive: true,
        isFeatured: true,
        images: [IMAGES.burgerDouble],
        metadata: {
          weight: '450g',
          calories: 1100,
          spicyLevel: 2,
          isHalal: true,
          preparationTime: 15,
          badge: 'Best Seller',
        },
      },
      {
        tenantId: burgerChina.id,
        name: 'Spicy Dragon Burger',
        slug: 'spicy-dragon-burger',
        description:
          'Untuk pecinta pedas! Patty 150gr dengan saus dragon fire, jalapeño, pepper jack cheese, dan crispy onion. Level pedas bisa disesuaikan.',
        category: 'Signature Burgers',
        sku: 'BRG-003',
        price: 52000,
        comparePrice: null,
        costPrice: 32000,
        stock: 60,
        minStock: 10,
        trackStock: true,
        unit: 'pcs',
        isActive: true,
        isFeatured: true,
        images: [IMAGES.burgerSpicy],
        metadata: {
          weight: '280g',
          calories: 720,
          spicyLevel: 4,
          isHalal: true,
          preparationTime: 12,
          badge: 'Spicy',
        },
      },
      {
        tenantId: burgerChina.id,
        name: 'Cheese Melt Burger',
        slug: 'cheese-melt-burger',
        description:
          'Surga untuk cheese lovers! Patty 150gr dengan triple cheese (cheddar, mozzarella, american), cheese sauce, dan truffle mayo.',
        category: 'Signature Burgers',
        sku: 'BRG-004',
        price: 58000,
        comparePrice: 68000,
        costPrice: 35000,
        stock: 70,
        minStock: 10,
        trackStock: true,
        unit: 'pcs',
        isActive: true,
        isFeatured: true,
        images: [IMAGES.burgerCheese],
        metadata: {
          weight: '300g',
          calories: 850,
          spicyLevel: 0,
          isHalal: true,
          preparationTime: 12,
          badge: 'Cheese Lovers',
        },
      },
      {
        tenantId: burgerChina.id,
        name: 'BBQ Bacon Beast',
        slug: 'bbq-bacon-beast',
        description:
          'Patty 150gr dengan BBQ sauce homemade, crispy bacon, cheddar cheese, onion rings, dan coleslaw. Smoky dan savory!',
        category: 'Signature Burgers',
        sku: 'BRG-005',
        price: 62000,
        comparePrice: null,
        costPrice: 38000,
        stock: 50,
        minStock: 10,
        trackStock: true,
        unit: 'pcs',
        isActive: true,
        isFeatured: true,
        images: [IMAGES.burgerBBQ],
        metadata: {
          weight: '320g',
          calories: 920,
          spicyLevel: 1,
          isHalal: true,
          preparationTime: 15,
        },
      },
      {
        tenantId: burgerChina.id,
        name: 'Mushroom Swiss Burger',
        slug: 'mushroom-swiss-burger',
        description:
          'Patty 150gr dengan sautéed mushroom, swiss cheese, garlic aioli, dan arugula. Untuk yang suka rasa earthy dan rich.',
        category: 'Signature Burgers',
        sku: 'BRG-006',
        price: 55000,
        comparePrice: null,
        costPrice: 33000,
        stock: 40,
        minStock: 10,
        trackStock: true,
        unit: 'pcs',
        isActive: true,
        isFeatured: false,
        images: [IMAGES.burgerMushroom],
        metadata: {
          weight: '290g',
          calories: 780,
          spicyLevel: 0,
          isHalal: true,
          preparationTime: 12,
        },
      },

      // ========== CHICKEN BURGERS ==========
      {
        tenantId: burgerChina.id,
        name: 'Chicken Teriyaki Burger',
        slug: 'chicken-teriyaki-burger',
        description:
          'Crispy chicken patty dengan teriyaki glaze, Japanese mayo, nori flakes, dan pickled ginger. Fusion Asia yang sempurna!',
        category: 'Chicken Burgers',
        sku: 'CHK-001',
        price: 48000,
        comparePrice: null,
        costPrice: 28000,
        stock: 80,
        minStock: 10,
        trackStock: true,
        unit: 'pcs',
        isActive: true,
        isFeatured: true,
        images: [IMAGES.burgerChicken],
        metadata: {
          weight: '260g',
          calories: 620,
          spicyLevel: 0,
          isHalal: true,
          preparationTime: 12,
          badge: 'Asian Fusion',
        },
      },
      {
        tenantId: burgerChina.id,
        name: 'Crispy Chicken Burger',
        slug: 'crispy-chicken-burger',
        description:
          'Ayam fillet crispy dengan coating renyah, coleslaw, pickles, dan honey mustard sauce. Simple tapi nagih!',
        category: 'Chicken Burgers',
        sku: 'CHK-002',
        price: 42000,
        comparePrice: null,
        costPrice: 25000,
        stock: 90,
        minStock: 10,
        trackStock: true,
        unit: 'pcs',
        isActive: true,
        isFeatured: false,
        images: [IMAGES.burgerChicken],
        metadata: {
          weight: '240g',
          calories: 580,
          spicyLevel: 0,
          isHalal: true,
          preparationTime: 10,
        },
      },

      // ========== SIDES ==========
      {
        tenantId: burgerChina.id,
        name: 'Dragon Fries',
        slug: 'dragon-fries',
        description:
          'Kentang goreng crispy dengan dragon seasoning, parmesan, dan garlic butter. Addictive!',
        category: 'Sides',
        sku: 'SDE-001',
        price: 25000,
        comparePrice: null,
        costPrice: 12000,
        stock: 200,
        minStock: 20,
        trackStock: true,
        unit: 'porsi',
        isActive: true,
        isFeatured: true,
        images: [IMAGES.frenchFries],
        metadata: {
          weight: '150g',
          calories: 380,
          spicyLevel: 1,
          isHalal: true,
          preparationTime: 8,
        },
      },
      {
        tenantId: burgerChina.id,
        name: 'Loaded Cheese Fries',
        slug: 'loaded-cheese-fries',
        description:
          'Kentang goreng dengan cheese sauce, beef bacon bits, jalapeño, dan sour cream.',
        category: 'Sides',
        sku: 'SDE-002',
        price: 35000,
        comparePrice: null,
        costPrice: 18000,
        stock: 150,
        minStock: 20,
        trackStock: true,
        unit: 'porsi',
        isActive: true,
        isFeatured: false,
        images: [IMAGES.frenchFries],
        metadata: {
          weight: '200g',
          calories: 520,
          spicyLevel: 1,
          isHalal: true,
          preparationTime: 10,
        },
      },
      {
        tenantId: burgerChina.id,
        name: 'Onion Rings',
        slug: 'onion-rings',
        description:
          'Onion rings crispy dengan batter homemade, disajikan dengan BBQ sauce dan ranch dip.',
        category: 'Sides',
        sku: 'SDE-003',
        price: 22000,
        comparePrice: null,
        costPrice: 10000,
        stock: 180,
        minStock: 20,
        trackStock: true,
        unit: 'porsi',
        isActive: true,
        isFeatured: false,
        images: [IMAGES.onionRings],
        metadata: {
          weight: '120g',
          calories: 340,
          spicyLevel: 0,
          isHalal: true,
          preparationTime: 8,
        },
      },
      {
        tenantId: burgerChina.id,
        name: 'Chicken Nuggets (6 pcs)',
        slug: 'chicken-nuggets',
        description:
          'Nugget ayam homemade dengan daging asli, bukan processed. Crispy di luar, juicy di dalam.',
        category: 'Sides',
        sku: 'SDE-004',
        price: 28000,
        comparePrice: null,
        costPrice: 15000,
        stock: 160,
        minStock: 20,
        trackStock: true,
        unit: 'porsi',
        isActive: true,
        isFeatured: false,
        images: [IMAGES.nuggets],
        metadata: {
          weight: '180g',
          calories: 420,
          spicyLevel: 0,
          isHalal: true,
          preparationTime: 8,
        },
      },
      {
        tenantId: burgerChina.id,
        name: 'Mozzarella Sticks (5 pcs)',
        slug: 'mozzarella-sticks',
        description:
          'Mozzarella cheese sticks yang stretchy, dengan marinara sauce untuk dipping.',
        category: 'Sides',
        sku: 'SDE-005',
        price: 30000,
        comparePrice: null,
        costPrice: 16000,
        stock: 120,
        minStock: 15,
        trackStock: true,
        unit: 'porsi',
        isActive: true,
        isFeatured: false,
        images: [IMAGES.mozzaStick],
        metadata: {
          weight: '150g',
          calories: 450,
          spicyLevel: 0,
          isHalal: true,
          preparationTime: 8,
        },
      },

      // ========== DRINKS ==========
      {
        tenantId: burgerChina.id,
        name: 'Ice Lemon Tea',
        slug: 'ice-lemon-tea',
        description:
          'Teh lemon segar dengan es, perfect companion untuk burger!',
        category: 'Drinks',
        sku: 'DRK-001',
        price: 15000,
        comparePrice: null,
        costPrice: 5000,
        stock: 500,
        minStock: 50,
        trackStock: true,
        unit: 'gelas',
        isActive: true,
        isFeatured: false,
        images: [IMAGES.icedTea],
        metadata: {
          volume: '400ml',
          calories: 120,
          isHalal: true,
          preparationTime: 2,
        },
      },
      {
        tenantId: burgerChina.id,
        name: 'Cola',
        slug: 'cola',
        description: 'Minuman soda klasik untuk menemani makan burger.',
        category: 'Drinks',
        sku: 'DRK-002',
        price: 12000,
        comparePrice: null,
        costPrice: 6000,
        stock: 600,
        minStock: 50,
        trackStock: true,
        unit: 'gelas',
        isActive: true,
        isFeatured: false,
        images: [IMAGES.cola],
        metadata: {
          volume: '400ml',
          calories: 180,
          isHalal: true,
          preparationTime: 1,
        },
      },
      {
        tenantId: burgerChina.id,
        name: 'Chocolate Milkshake',
        slug: 'chocolate-milkshake',
        description:
          'Milkshake coklat premium dengan whipped cream dan chocolate drizzle.',
        category: 'Drinks',
        sku: 'DRK-003',
        price: 28000,
        comparePrice: null,
        costPrice: 12000,
        stock: 200,
        minStock: 20,
        trackStock: true,
        unit: 'gelas',
        isActive: true,
        isFeatured: true,
        images: [IMAGES.milkshake],
        metadata: {
          volume: '350ml',
          calories: 450,
          isHalal: true,
          preparationTime: 5,
        },
      },
      {
        tenantId: burgerChina.id,
        name: 'Vanilla Milkshake',
        slug: 'vanilla-milkshake',
        description:
          'Milkshake vanilla klasik yang creamy, dengan whipped cream topping.',
        category: 'Drinks',
        sku: 'DRK-004',
        price: 28000,
        comparePrice: null,
        costPrice: 12000,
        stock: 200,
        minStock: 20,
        trackStock: true,
        unit: 'gelas',
        isActive: true,
        isFeatured: false,
        images: [IMAGES.milkshake],
        metadata: {
          volume: '350ml',
          calories: 420,
          isHalal: true,
          preparationTime: 5,
        },
      },
      {
        tenantId: burgerChina.id,
        name: 'Fresh Lemonade',
        slug: 'fresh-lemonade',
        description:
          'Lemonade segar dengan perasan lemon asli dan mint leaves.',
        category: 'Drinks',
        sku: 'DRK-005',
        price: 18000,
        comparePrice: null,
        costPrice: 7000,
        stock: 300,
        minStock: 30,
        trackStock: true,
        unit: 'gelas',
        isActive: true,
        isFeatured: false,
        images: [IMAGES.lemonade],
        metadata: {
          volume: '400ml',
          calories: 90,
          isHalal: true,
          preparationTime: 3,
        },
      },

      // ========== COMBO / PAKET ==========
      {
        tenantId: burgerChina.id,
        name: 'Combo Classic',
        slug: 'combo-classic',
        description:
          'Classic China Burger + Dragon Fries + Ice Lemon Tea. Hemat Rp 15.000!',
        category: 'Combo',
        sku: 'CMB-001',
        price: 70000,
        comparePrice: 85000,
        costPrice: 45000,
        stock: null,
        minStock: null,
        trackStock: false,
        unit: 'paket',
        isActive: true,
        isFeatured: true,
        images: [IMAGES.burgerClassic, IMAGES.frenchFries, IMAGES.icedTea],
        metadata: {
          items: ['Classic China Burger', 'Dragon Fries', 'Ice Lemon Tea'],
          savings: 15000,
          isHalal: true,
          preparationTime: 15,
          badge: 'Value Deal',
        },
      },
      {
        tenantId: burgerChina.id,
        name: 'Combo Dragon',
        slug: 'combo-dragon',
        description:
          'Double Dragon Burger + Loaded Cheese Fries + Chocolate Milkshake. Hemat Rp 23.000!',
        category: 'Combo',
        sku: 'CMB-002',
        price: 115000,
        comparePrice: 138000,
        costPrice: 75000,
        stock: null,
        minStock: null,
        trackStock: false,
        unit: 'paket',
        isActive: true,
        isFeatured: true,
        images: [IMAGES.burgerDouble, IMAGES.frenchFries, IMAGES.milkshake],
        metadata: {
          items: [
            'Double Dragon Burger',
            'Loaded Cheese Fries',
            'Chocolate Milkshake',
          ],
          savings: 23000,
          isHalal: true,
          preparationTime: 20,
          badge: 'Best Value',
        },
      },
    ],
  });

  console.log(`✅ Created ${products.count} products`);

  // ==========================================
  // CREATE CUSTOMERS
  // ==========================================
  console.log('\n👥 Creating Customers...');

  const customer1 = await prisma.customer.create({
    data: {
      tenantId: burgerChina.id,
      name: 'Budi Santoso',
      phone: '081234567101',
      email: 'budi.santoso@email.com',
      address: 'Jl. Sudirman No. 100, Jakarta Pusat',
      totalOrders: 15,
      totalSpent: 1250000,
      metadata: {
        favoriteItem: 'Double Dragon Burger',
        notes: 'Pelanggan loyal, suka extra spicy',
        birthday: '1990-05-15',
      },
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      tenantId: burgerChina.id,
      name: 'Siti Rahayu',
      phone: '081234567102',
      email: 'siti.rahayu@email.com',
      address: 'Jl. Thamrin No. 50, Jakarta Pusat',
      totalOrders: 8,
      totalSpent: 680000,
      metadata: {
        favoriteItem: 'Chicken Teriyaki Burger',
        notes: 'Order untuk kantor setiap Jumat',
        companyName: 'PT Maju Jaya',
      },
    },
  });

  const customer3 = await prisma.customer.create({
    data: {
      tenantId: burgerChina.id,
      name: 'Ahmad Rizki',
      phone: '081234567103',
      email: 'ahmad.rizki@email.com',
      address: 'Jl. Gatot Subroto No. 25, Jakarta Selatan',
      totalOrders: 22,
      totalSpent: 1890000,
      metadata: {
        favoriteItem: 'Spicy Dragon Burger',
        notes: 'Pelanggan paling sering order, mahasiswa',
        memberSince: '2023-01',
      },
    },
  });

  console.log('✅ Created 3 customers');

  // ==========================================
  // CREATE ORDERS
  // ==========================================
  console.log('\n📋 Creating Sample Orders...');

  // Get products for orders
  const allProducts = await prisma.product.findMany({
    where: { tenantId: burgerChina.id },
  });

  const getProduct = (sku: string) => allProducts.find((p) => p.sku === sku);

  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000);

  // Order 1 - Completed, Paid
  const order1 = await prisma.order.create({
    data: {
      tenantId: burgerChina.id,
      customerId: customer1.id,
      orderNumber: generateOrderNumber(today, 1),
      subtotal: 150000,
      discount: 10000,
      tax: 0,
      total: 140000,
      paymentMethod: 'transfer',
      paymentStatus: PaymentStatus.PAID,
      paidAmount: 140000,
      status: OrderStatus.COMPLETED,
      completedAt: new Date(),
      notes: 'Extra spicy untuk semua burger',
      metadata: {
        deliveryAddress: 'Jl. Sudirman No. 100',
        deliveryTime: '12:30',
      },
      items: {
        create: [
          {
            productId: getProduct('BRG-002')?.id,
            name: 'Double Dragon Burger',
            price: 75000,
            qty: 2,
            subtotal: 150000,
            notes: 'Extra spicy',
          },
        ],
      },
    },
  });

  // Order 2 - Processing
  const order2 = await prisma.order.create({
    data: {
      tenantId: burgerChina.id,
      customerId: customer2.id,
      orderNumber: generateOrderNumber(today, 2),
      subtotal: 480000,
      discount: 30000,
      tax: 0,
      total: 450000,
      paymentMethod: 'transfer',
      paymentStatus: PaymentStatus.PAID,
      paidAmount: 450000,
      status: OrderStatus.PROCESSING,
      notes: 'Order untuk meeting kantor, pisahkan per box',
      metadata: {
        deliveryAddress: 'Jl. Thamrin No. 50, Gedung A Lt. 5',
        deliveryTime: '11:45',
        contactPerson: 'Ibu Siti',
      },
      items: {
        create: [
          {
            productId: getProduct('CHK-001')?.id,
            name: 'Chicken Teriyaki Burger',
            price: 48000,
            qty: 10,
            subtotal: 480000,
            notes: 'Pisahkan saus',
          },
        ],
      },
    },
  });

  // Order 3 - Pending
  const order3 = await prisma.order.create({
    data: {
      tenantId: burgerChina.id,
      customerId: customer3.id,
      orderNumber: generateOrderNumber(today, 3),
      subtotal: 115000,
      discount: 0,
      tax: 0,
      total: 115000,
      paymentMethod: 'cod',
      paymentStatus: PaymentStatus.PENDING,
      paidAmount: 0,
      status: OrderStatus.PENDING,
      notes: null,
      metadata: {
        deliveryAddress: 'Jl. Gatot Subroto No. 25',
        deliveryTime: '19:00',
      },
      items: {
        create: [
          {
            productId: getProduct('CMB-002')?.id,
            name: 'Combo Dragon',
            price: 115000,
            qty: 1,
            subtotal: 115000,
          },
        ],
      },
    },
  });

  // Order 4 - Yesterday, Completed (for history)
  const order4 = await prisma.order.create({
    data: {
      tenantId: burgerChina.id,
      customerId: customer1.id,
      orderNumber: generateOrderNumber(yesterday, 1),
      subtotal: 162000,
      discount: 0,
      tax: 0,
      total: 162000,
      paymentMethod: 'qris',
      paymentStatus: PaymentStatus.PAID,
      paidAmount: 162000,
      status: OrderStatus.COMPLETED,
      completedAt: yesterday,
      createdAt: yesterday,
      items: {
        create: [
          {
            productId: getProduct('BRG-003')?.id,
            name: 'Spicy Dragon Burger',
            price: 52000,
            qty: 2,
            subtotal: 104000,
          },
          {
            productId: getProduct('SDE-001')?.id,
            name: 'Dragon Fries',
            price: 25000,
            qty: 1,
            subtotal: 25000,
          },
          {
            productId: getProduct('DRK-003')?.id,
            name: 'Chocolate Milkshake',
            price: 28000,
            qty: 1,
            subtotal: 28000,
          },
        ],
      },
    },
  });

  // Order 5 - Guest order (no customer account)
  const order5 = await prisma.order.create({
    data: {
      tenantId: burgerChina.id,
      customerId: null,
      customerName: 'John Doe',
      customerPhone: '081999888777',
      orderNumber: generateOrderNumber(today, 4),
      subtotal: 70000,
      discount: 0,
      tax: 0,
      total: 70000,
      paymentMethod: 'cash',
      paymentStatus: PaymentStatus.PAID,
      paidAmount: 70000,
      status: OrderStatus.COMPLETED,
      completedAt: new Date(),
      notes: 'Take away',
      items: {
        create: [
          {
            productId: getProduct('CMB-001')?.id,
            name: 'Combo Classic',
            price: 70000,
            qty: 1,
            subtotal: 70000,
          },
        ],
      },
    },
  });

  console.log('✅ Created 5 sample orders');

  // ==========================================
  // SUMMARY
  // ==========================================
  console.log('\n' + '='.repeat(60));
  console.log('🎉 SEED COMPLETED SUCCESSFULLY!');
  console.log('='.repeat(60));

  console.log('\n📊 SUMMARY:\n');

  console.log('🍔 TENANT: Burger China');
  console.log('┌────────────────────────────────────────────────────────┐');
  console.log('│ Slug        : burgerchina                              │');
  console.log('│ Email       : burgerchina@fibidy.com                   │');
  console.log('│ Password    : password123                              │');
  console.log('│ Category    : RESTORAN                                 │');
  console.log('│ Theme       : Orange (#f97316)                         │');
  console.log('└────────────────────────────────────────────────────────┘');

  console.log('\n📦 PRODUCTS BY CATEGORY:');
  console.log('  • Signature Burgers : 6');
  console.log('  • Chicken Burgers   : 2');
  console.log('  • Sides             : 5');
  console.log('  • Drinks            : 5');
  console.log('  • Combo             : 2');
  console.log('  ─────────────────────');
  console.log('  • TOTAL             : 20 products');

  console.log('\n👥 CUSTOMERS: 3');
  console.log('📋 ORDERS   : 5');

  console.log('\n🌐 ACCESS URLs:');
  console.log('  • Dashboard : http://localhost:3000/auth/login');
  console.log('  • Store     : http://localhost:3000/store/burgerchina');

  console.log('\n🔑 LOGIN CREDENTIALS:');
  console.log('  • Email    : burgerchina@fibidy.com');
  console.log('  • Password : password123');

  console.log('\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
