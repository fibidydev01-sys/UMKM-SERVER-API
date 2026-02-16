import { PrismaClient, TenantStatus } from '@prisma/client';
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
// MAIN SEED
// ==========================================

async function main() {
  console.log('🍔 Starting Burger China Seed...\n');

  // Clean existing data
  console.log('🧹 Cleaning existing data...');
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
        enabled: true,
        template: 'modern-starter',
        sectionOrder: [
          'hero',
          'about',
          'products',
          'testimonials',
          'cta',
          'contact',
        ],
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
        stock: 100,
        trackStock: true,
        unit: 'pcs',
        isActive: true,
        isFeatured: true,
        images: [IMAGES.burgerClassic],
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
        stock: 80,
        trackStock: true,
        unit: 'pcs',
        isActive: true,
        isFeatured: true,
        images: [IMAGES.burgerDouble],
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
        stock: 60,
        trackStock: true,
        unit: 'pcs',
        isActive: true,
        isFeatured: true,
        images: [IMAGES.burgerSpicy],
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
        stock: 70,
        trackStock: true,
        unit: 'pcs',
        isActive: true,
        isFeatured: true,
        images: [IMAGES.burgerCheese],
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
        stock: 50,
        trackStock: true,
        unit: 'pcs',
        isActive: true,
        isFeatured: true,
        images: [IMAGES.burgerBBQ],
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
        stock: 40,
        trackStock: true,
        unit: 'pcs',
        isActive: true,
        isFeatured: false,
        images: [IMAGES.burgerMushroom],
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
        stock: 80,
        trackStock: true,
        unit: 'pcs',
        isActive: true,
        isFeatured: true,
        images: [IMAGES.burgerChicken],
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
        stock: 90,
        trackStock: true,
        unit: 'pcs',
        isActive: true,
        isFeatured: false,
        images: [IMAGES.burgerChicken],
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
        stock: 200,
        trackStock: true,
        unit: 'porsi',
        isActive: true,
        isFeatured: true,
        images: [IMAGES.frenchFries],
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
        stock: 150,
        trackStock: true,
        unit: 'porsi',
        isActive: true,
        isFeatured: false,
        images: [IMAGES.frenchFries],
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
        stock: 180,
        trackStock: true,
        unit: 'porsi',
        isActive: true,
        isFeatured: false,
        images: [IMAGES.onionRings],
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
        stock: 160,
        trackStock: true,
        unit: 'porsi',
        isActive: true,
        isFeatured: false,
        images: [IMAGES.nuggets],
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
        stock: 120,
        trackStock: true,
        unit: 'porsi',
        isActive: true,
        isFeatured: false,
        images: [IMAGES.mozzaStick],
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
        stock: 500,
        trackStock: true,
        unit: 'gelas',
        isActive: true,
        isFeatured: false,
        images: [IMAGES.icedTea],
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
        stock: 600,
        trackStock: true,
        unit: 'gelas',
        isActive: true,
        isFeatured: false,
        images: [IMAGES.cola],
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
        stock: 200,
        trackStock: true,
        unit: 'gelas',
        isActive: true,
        isFeatured: true,
        images: [IMAGES.milkshake],
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
        stock: 200,
        trackStock: true,
        unit: 'gelas',
        isActive: true,
        isFeatured: false,
        images: [IMAGES.milkshake],
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
        stock: 300,
        trackStock: true,
        unit: 'gelas',
        isActive: true,
        isFeatured: false,
        images: [IMAGES.lemonade],
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
        stock: null,
        trackStock: false,
        unit: 'paket',
        isActive: true,
        isFeatured: true,
        images: [IMAGES.burgerClassic, IMAGES.frenchFries, IMAGES.icedTea],
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
        stock: null,
        trackStock: false,
        unit: 'paket',
        isActive: true,
        isFeatured: true,
        images: [IMAGES.burgerDouble, IMAGES.frenchFries, IMAGES.milkshake],
      },
    ],
  });

  console.log(`✅ Created ${products.count} products`);

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

  console.log('\n🌐 ACCESS URLs:');
  console.log('  • Dashboard : http://localhost:3000/auth/login');
  console.log('  • Store     : http://localhost:3000/store/burgerchina');

  console.log('\n🔑 LOGIN CREDENTIALS:');
  console.log('  • Email    : burgerchina@fibidy.com');
  console.log('  • Password : password123');

  console.log('\n💬 ORDER VIA WHATSAPP:');
  console.log('  • Number   : +6281234567890');
  console.log('  • Link     : https://wa.me/6281234567890');

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
