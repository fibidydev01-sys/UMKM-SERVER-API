// ==========================================
// LANDING CONFIG VALIDATOR
// server/src/validators/landing-config.validator.ts
// ==========================================

import Ajv, { ErrorObject } from 'ajv'; // ✅ FIX: Removed unused JSONSchemaType
import addFormats from 'ajv-formats';

// ==========================================
// TYPE DEFINITIONS
// ==========================================

export interface TestimonialItem {
  id: string;
  name: string;
  role?: string;
  avatar?: string;
  content: string;
  rating?: number;
}

export interface FeatureItem {
  icon?: string;
  title: string;
  description: string;
}

export interface HeroConfig {
  layout?: 'centered' | 'left' | 'right';
  showCta?: boolean;
  ctaText?: string;
  ctaLink?: string;
  backgroundImage?: string;
  overlayOpacity?: number;
}

export interface AboutConfig {
  content?: string;
  showImage?: boolean;
  image?: string;
  features?: FeatureItem[];
}

export interface ProductsConfig {
  displayMode?: 'featured' | 'latest' | 'all';
  limit?: number;
  showViewAll?: boolean;
}

export interface TestimonialsConfig {
  items?: TestimonialItem[];
}

export interface ContactConfig {
  showMap?: boolean;
  showForm?: boolean;
  showSocialMedia?: boolean;
}

export interface CtaConfig {
  buttonText?: string;
  buttonLink?: string;
  style?: 'primary' | 'secondary' | 'outline';
}

export interface LandingSection<T = Record<string, unknown>> {
  enabled?: boolean;
  title?: string;
  subtitle?: string;
  config?: T;
}

export interface LandingConfig {
  [key: string]: unknown; // ✅ FIX: Add index signature for Prisma compatibility
  enabled?: boolean;
  templateId?: string;
  hero?: LandingSection<HeroConfig>;
  about?: LandingSection<AboutConfig>;
  products?: LandingSection<ProductsConfig>;
  testimonials?: LandingSection<TestimonialsConfig>;
  contact?: LandingSection<ContactConfig>;
  cta?: LandingSection<CtaConfig>;
}

export interface ValidationResult {
  valid: boolean;
  data?: LandingConfig;
  errors?: string[];
  warnings?: string[];
}

// ==========================================
// JSON SCHEMA DEFINITIONS
// ==========================================

const testimonialItemSchema = {
  type: 'object' as const,
  required: ['id', 'name', 'content'],
  properties: {
    id: { type: 'string' as const, minLength: 1, maxLength: 100 },
    name: { type: 'string' as const, minLength: 1, maxLength: 100 },
    role: { type: 'string' as const, maxLength: 100 },
    avatar: { type: 'string' as const, maxLength: 500 },
    content: { type: 'string' as const, minLength: 1, maxLength: 1000 },
    rating: { type: 'integer' as const, minimum: 1, maximum: 5 },
  },
  additionalProperties: false,
};

const featureItemSchema = {
  type: 'object' as const,
  required: ['title', 'description'],
  properties: {
    icon: { type: 'string' as const, maxLength: 50 },
    title: { type: 'string' as const, minLength: 1, maxLength: 100 },
    description: { type: 'string' as const, minLength: 1, maxLength: 500 },
  },
  additionalProperties: false,
};

const landingConfigSchema = {
  type: 'object' as const,
  properties: {
    enabled: { type: 'boolean' as const },
    templateId: { type: 'string' as const, maxLength: 50 },

    hero: {
      type: 'object' as const,
      properties: {
        enabled: { type: 'boolean' as const },
        title: { type: 'string' as const, maxLength: 200 },
        subtitle: { type: 'string' as const, maxLength: 500 },
        config: {
          type: 'object' as const,
          properties: {
            layout: {
              type: 'string' as const,
              enum: ['centered', 'left', 'right'],
            },
            showCta: { type: 'boolean' as const },
            ctaText: { type: 'string' as const, maxLength: 50 },
            ctaLink: { type: 'string' as const, maxLength: 200 },
            backgroundImage: { type: 'string' as const, maxLength: 500 },
            overlayOpacity: { type: 'number' as const, minimum: 0, maximum: 1 },
          },
          additionalProperties: false,
        },
      },
      additionalProperties: false,
    },

    about: {
      type: 'object' as const,
      properties: {
        enabled: { type: 'boolean' as const },
        title: { type: 'string' as const, maxLength: 200 },
        subtitle: { type: 'string' as const, maxLength: 500 },
        config: {
          type: 'object' as const,
          properties: {
            content: { type: 'string' as const, maxLength: 2000 },
            showImage: { type: 'boolean' as const },
            image: { type: 'string' as const, maxLength: 500 },
            features: {
              type: 'array' as const,
              maxItems: 10,
              items: featureItemSchema,
            },
          },
          additionalProperties: false,
        },
      },
      additionalProperties: false,
    },

    products: {
      type: 'object' as const,
      properties: {
        enabled: { type: 'boolean' as const },
        title: { type: 'string' as const, maxLength: 200 },
        subtitle: { type: 'string' as const, maxLength: 500 },
        config: {
          type: 'object' as const,
          properties: {
            displayMode: {
              type: 'string' as const,
              enum: ['featured', 'latest', 'all'],
            },
            limit: { type: 'integer' as const, minimum: 1, maximum: 50 },
            showViewAll: { type: 'boolean' as const },
          },
          additionalProperties: false,
        },
      },
      additionalProperties: false,
    },

    testimonials: {
      type: 'object' as const,
      properties: {
        enabled: { type: 'boolean' as const },
        title: { type: 'string' as const, maxLength: 200 },
        subtitle: { type: 'string' as const, maxLength: 500 },
        config: {
          type: 'object' as const,
          properties: {
            items: {
              type: 'array' as const,
              maxItems: 50,
              items: testimonialItemSchema,
            },
          },
          additionalProperties: false,
        },
      },
      additionalProperties: false,
    },

    contact: {
      type: 'object' as const,
      properties: {
        enabled: { type: 'boolean' as const },
        title: { type: 'string' as const, maxLength: 200 },
        subtitle: { type: 'string' as const, maxLength: 500 },
        config: {
          type: 'object' as const,
          properties: {
            showMap: { type: 'boolean' as const },
            showForm: { type: 'boolean' as const },
            showSocialMedia: { type: 'boolean' as const },
          },
          additionalProperties: false,
        },
      },
      additionalProperties: false,
    },

    cta: {
      type: 'object' as const,
      properties: {
        enabled: { type: 'boolean' as const },
        title: { type: 'string' as const, maxLength: 200 },
        subtitle: { type: 'string' as const, maxLength: 500 },
        config: {
          type: 'object' as const,
          properties: {
            buttonText: { type: 'string' as const, maxLength: 50 },
            buttonLink: { type: 'string' as const, maxLength: 200 },
            style: {
              type: 'string' as const,
              enum: ['primary', 'secondary', 'outline'],
            },
          },
          additionalProperties: false,
        },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
};

// ==========================================
// AJV INSTANCE
// ==========================================

const ajv = new Ajv({
  allErrors: true,
  removeAdditional: 'all',
  useDefaults: true,
  coerceTypes: false,
});

addFormats(ajv);

const validateSchema = ajv.compile(landingConfigSchema);

// ==========================================
// SANITIZATION FUNCTIONS
// ==========================================

function flattenNestedArrays<T>(arr: unknown): T[] {
  if (!arr) return [];

  let items = arr;

  while (Array.isArray(items) && items.length > 0 && Array.isArray(items[0])) {
    items = items.flat();
  }

  if (!Array.isArray(items)) return [];

  return items as T[];
}

function deduplicateById<T extends { id: string }>(
  items: T[],
  warningCallback?: (id: string) => void,
): T[] {
  const seen = new Set<string>();
  const unique: T[] = [];

  for (const item of items) {
    if (!item?.id) continue;

    if (seen.has(item.id)) {
      warningCallback?.(item.id);
      continue;
    }

    seen.add(item.id);
    unique.push(item);
  }

  return unique;
}

function ensureTestimonialIds(items: TestimonialItem[]): TestimonialItem[] {
  return items.map((item, index) => ({
    ...item,
    id:
      item.id ||
      `testi_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 7)}`,
  }));
}

function sanitizeTestimonials(
  config: TestimonialsConfig | undefined,
  warningsList: string[], // ✅ FIX: Renamed to warningsList to indicate it's used
): TestimonialsConfig {
  if (!config) return { items: [] };

  let items = config.items;

  items = flattenNestedArrays<TestimonialItem>(items);

  items = items.filter(
    (item): item is TestimonialItem =>
      item &&
      typeof item === 'object' &&
      typeof item.name === 'string' &&
      item.name.trim() !== '' &&
      typeof item.content === 'string' &&
      item.content.trim() !== '',
  );

  items = ensureTestimonialIds(items);

  items = deduplicateById(items, (id) => {
    warningsList.push(`Duplicate testimonial ID removed: ${id}`);
  });

  return { items };
}

function sanitizeFeatures(
  features: FeatureItem[] | undefined,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _warningsList: string[], // ✅ FIX: Prefix with _ to indicate intentionally unused
): FeatureItem[] {
  if (!features) return [];

  let items = flattenNestedArrays<FeatureItem>(features);

  items = items.filter(
    (item): item is FeatureItem =>
      item &&
      typeof item === 'object' &&
      typeof item.title === 'string' &&
      item.title.trim() !== '' &&
      typeof item.description === 'string' &&
      item.description.trim() !== '',
  );

  return items;
}

// ==========================================
// MAIN VALIDATION FUNCTION
// ==========================================

export function validateAndSanitizeLandingConfig(
  data: unknown,
): ValidationResult {
  const warnings: string[] = [];

  if (data === null || data === undefined) {
    return {
      valid: true,
      data: undefined,
      warnings: [],
    };
  }

  if (typeof data !== 'object' || Array.isArray(data)) {
    return {
      valid: false,
      errors: ['landingConfig must be an object'],
    };
  }

  let config: LandingConfig;
  try {
    config = JSON.parse(JSON.stringify(data)) as LandingConfig;
  } catch {
    return {
      valid: false,
      errors: ['landingConfig contains invalid JSON'],
    };
  }

  if (config.testimonials?.config) {
    config.testimonials.config = sanitizeTestimonials(
      config.testimonials.config,
      warnings,
    );
  }

  if (config.about?.config?.features) {
    config.about.config.features = sanitizeFeatures(
      config.about.config.features,
      warnings,
    );
  }

  const valid = validateSchema(config);

  if (!valid) {
    const errors = (validateSchema.errors || []).map((err: ErrorObject) => {
      const path = err.instancePath || '/';
      const message = err.message || 'unknown error';
      return `${path}: ${message}`;
    });

    return {
      valid: false,
      errors,
      warnings,
    };
  }

  if (config.hero?.title) config.hero.title = config.hero.title.trim();
  if (config.hero?.subtitle) config.hero.subtitle = config.hero.subtitle.trim();
  if (config.about?.title) config.about.title = config.about.title.trim();
  if (config.about?.subtitle)
    config.about.subtitle = config.about.subtitle.trim();
  if (config.about?.config?.content) {
    config.about.config.content = config.about.config.content.trim();
  }

  config.enabled = config.enabled ?? false;

  return {
    valid: true,
    data: config,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

// ==========================================
// UTILITY EXPORTS
// ==========================================

export function isValidLandingConfig(data: unknown): boolean {
  if (data === null || data === undefined) return true;
  if (typeof data !== 'object' || Array.isArray(data)) return false;

  try {
    const clone = JSON.parse(JSON.stringify(data));
    return validateSchema(clone);
  } catch {
    return false;
  }
}

export function getLandingConfigErrors(data: unknown): string[] {
  if (data === null || data === undefined) return [];
  if (typeof data !== 'object' || Array.isArray(data)) {
    return ['landingConfig must be an object'];
  }

  try {
    const clone = JSON.parse(JSON.stringify(data));
    validateSchema(clone);

    return (validateSchema.errors || []).map((err: ErrorObject) => {
      const path = err.instancePath || '/';
      const message = err.message || 'unknown error';
      return `${path}: ${message}`;
    });
  } catch {
    return ['landingConfig contains invalid JSON'];
  }
}

// ==========================================
// DEFAULT CONFIG GENERATOR
// ==========================================

export function getDefaultLandingConfig(): LandingConfig {
  return {
    enabled: false,
    hero: {
      enabled: false,
      title: '',
      subtitle: '',
      config: {
        layout: 'centered',
        showCta: false,
        ctaText: 'Lihat Produk',
        overlayOpacity: 0.5,
      },
    },
    about: {
      enabled: false,
      title: 'Tentang Kami',
      subtitle: '',
      config: {
        showImage: false,
        features: [],
      },
    },
    products: {
      enabled: false,
      title: 'Produk Kami',
      subtitle: 'Pilihan produk terbaik untuk Anda',
      config: {
        displayMode: 'featured',
        limit: 8,
        showViewAll: false,
      },
    },
    testimonials: {
      enabled: false,
      title: 'Testimoni',
      subtitle: 'Apa kata pelanggan kami',
      config: {
        items: [],
      },
    },
    contact: {
      enabled: false,
      title: 'Hubungi Kami',
      subtitle: '',
      config: {
        showMap: false,
        showForm: false,
        showSocialMedia: false,
      },
    },
    cta: {
      enabled: false,
      title: 'Siap Berbelanja?',
      subtitle: '',
      config: {
        buttonText: 'Mulai Belanja',
        style: 'primary',
      },
    },
  };
}
