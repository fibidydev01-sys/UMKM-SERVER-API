import { Injectable } from '@nestjs/common';
import { AutoReplyRule, KeywordMatchType } from '@prisma/client';

@Injectable()
export class KeywordEngine {
  /**
   * Check if message matches keyword rule
   */
  matchKeyword(rule: AutoReplyRule, message: string): boolean {
    if (!rule.keywords || rule.keywords.length === 0) {
      return false;
    }

    const text = rule.caseSensitive ? message : message.toLowerCase();

    for (const keyword of rule.keywords) {
      const key = rule.caseSensitive ? keyword : keyword.toLowerCase();

      switch (rule.matchType) {
        case KeywordMatchType.EXACT:
          if (text === key) return true;
          break;

        case KeywordMatchType.CONTAINS:
          if (text.includes(key)) return true;
          break;

        case KeywordMatchType.STARTS_WITH:
          if (text.startsWith(key)) return true;
          break;
      }
    }

    return false;
  }

  /**
   * Find matched keyword for logging
   */
  findMatchedKeyword(rule: AutoReplyRule, message: string): string | null {
    if (!rule.keywords || rule.keywords.length === 0) {
      return null;
    }

    const text = rule.caseSensitive ? message : message.toLowerCase();

    for (const keyword of rule.keywords) {
      const key = rule.caseSensitive ? keyword : keyword.toLowerCase();

      switch (rule.matchType) {
        case KeywordMatchType.EXACT:
          if (text === key) return keyword;
          break;

        case KeywordMatchType.CONTAINS:
          if (text.includes(key)) return keyword;
          break;

        case KeywordMatchType.STARTS_WITH:
          if (text.startsWith(key)) return keyword;
          break;
      }
    }

    return null;
  }
}
