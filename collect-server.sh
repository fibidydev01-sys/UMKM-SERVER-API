#!/bin/bash

# ================================================================
# SERVER — SMART INTERACTIVE COLLECTION
# Choose what to collect: Core, Modules, or Utils
# Run from: server directory
# ================================================================

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
WHITE='\033[1;37m'
NC='\033[0m'

PROJECT_ROOT="."
SRC_DIR="$PROJECT_ROOT/src"
OUT="collections"
mkdir -p "$OUT"

# ================================================================
# HELPER FUNCTIONS
# ================================================================

collect_file() {
    local file=$1
    local output=$2
    
    if [ -f "$file" ]; then
        local rel="${file#$PROJECT_ROOT/}"
        local lines=$(wc -l < "$file" 2>/dev/null || echo "0")
        echo -e "${GREEN}  ✓ ${NC}$rel ${CYAN}(${lines} lines)${NC}"
        echo "================================================" >> "$output"
        echo "FILE: $rel" >> "$output"
        echo "Lines: $lines" >> "$output"
        echo "================================================" >> "$output"
        echo "" >> "$output"
        cat "$file" >> "$output"
        echo -e "\n\n" >> "$output"
    else
        echo -e "${YELLOW}  ⚠ NOT FOUND: ${file#$PROJECT_ROOT/}${NC}"
    fi
}

collect_folder() {
    local folder=$1
    local output=$2
    
    if [ ! -d "$folder" ]; then
        echo -e "${YELLOW}  ⚠ FOLDER NOT FOUND: ${folder#$PROJECT_ROOT/}${NC}"
        return
    fi
    
    local collected=0
    
    # Find all TS/JS files, skip test files
    while IFS= read -r -d '' file; do
        collect_file "$file" "$output"
        ((collected++))
    done < <(find "$folder" -type f \( -name "*.ts" -o -name "*.js" \) \
        ! -name "*.spec.*" ! -name "*.test.*" \
        ! -path "*/node_modules/*" -print0 2>/dev/null)
    
    echo -e "${CYAN}  → Collected: $collected files${NC}"
}

section_header() {
    local label=$1
    local output=$2
    echo "" >> "$output"
    echo "################################################################" >> "$output"
    echo "##  $label" >> "$output"
    echo "################################################################" >> "$output"
    echo "" >> "$output"
    echo -e "\n${MAGENTA}▶ $label${NC}"
}

# ================================================================
# COLLECTION FUNCTIONS
# ================================================================

collect_core() {
    local output=$1
    echo -e "\n${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  COLLECTING: CORE (Root, Config, Prisma)                  ${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"
    
    section_header "ROOT - Config Files" "$output"
    collect_file "$PROJECT_ROOT/package.json" "$output"
    collect_file "$PROJECT_ROOT/tsconfig.json" "$output"
    collect_file "$PROJECT_ROOT/tsconfig.build.json" "$output"
    collect_file "$PROJECT_ROOT/nest-cli.json" "$output"
    collect_file "$PROJECT_ROOT/.prettierrc" "$output"
    collect_file "$PROJECT_ROOT/.env.example" "$output"
    collect_file "$PROJECT_ROOT/README.md" "$output"
    
    section_header "PRISMA - Schema" "$output"
    collect_file "$PROJECT_ROOT/prisma/schema.prisma" "$output"
    
    section_header "SRC - Root Files" "$output"
    collect_file "$SRC_DIR/main.ts" "$output"
    collect_file "$SRC_DIR/app.module.ts" "$output"
    collect_file "$SRC_DIR/app.controller.ts" "$output"
    collect_file "$SRC_DIR/app.service.ts" "$output"
    
    section_header "CONFIG" "$output"
    collect_folder "$SRC_DIR/config" "$output"
    
    section_header "PRISMA Service" "$output"
    collect_folder "$SRC_DIR/prisma" "$output"
    
    section_header "COMMON (Guards, Decorators, Filters, Pipes)" "$output"
    collect_folder "$SRC_DIR/common" "$output"
    
    section_header "VALIDATORS" "$output"
    collect_folder "$SRC_DIR/validators" "$output"
}

collect_modules() {
    local output=$1
    echo -e "\n${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  COLLECTING: MODULES (Business Logic)                     ${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"
    
    section_header "AUTH Module" "$output"
    collect_folder "$SRC_DIR/auth" "$output"
    
    section_header "TENANTS Module" "$output"
    collect_folder "$SRC_DIR/tenants" "$output"
    
    section_header "PRODUCTS Module" "$output"
    collect_folder "$SRC_DIR/products" "$output"
    
    section_header "PAYMENT Module (Midtrans)" "$output"
    collect_folder "$SRC_DIR/payment" "$output"
    
    section_header "SUBSCRIPTION Module" "$output"
    collect_folder "$SRC_DIR/subscription" "$output"
    
    section_header "STORE Module (Public)" "$output"
    collect_folder "$SRC_DIR/store" "$output"
}

collect_utils() {
    local output=$1
    echo -e "\n${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  COLLECTING: UTILS (SEO, Redis, Sitemap)                  ${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"
    
    section_header "REDIS Service" "$output"
    collect_folder "$SRC_DIR/redis" "$output"
    
    section_header "SEO Engine" "$output"
    collect_folder "$SRC_DIR/seo" "$output"
    
    section_header "SITEMAP Generator" "$output"
    collect_folder "$SRC_DIR/sitemap" "$output"
}

# ================================================================
# MENU & MAIN
# ================================================================

show_menu() {
    clear
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║   SERVER — SMART INTERACTIVE COLLECTION                   ║${NC}"
    echo -e "${BLUE}║   NestJS Backend Collection Tool                          ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${WHITE}Select what to collect:${NC}"
    echo ""
    echo -e "${GREEN}  1)${NC} Core (Root, Config, Prisma, Common, Validators)"
    echo -e "      ${CYAN}→ Essential infrastructure & base setup${NC}"
    echo ""
    echo -e "${GREEN}  2)${NC} Modules (Business Logic)"
    echo -e "      ${CYAN}→ Auth, Tenants, Products, Payment, Subscription, Store${NC}"
    echo ""
    echo -e "${GREEN}  3)${NC} Utils (Services & Helpers)"
    echo -e "      ${CYAN}→ Redis, SEO Engine, Sitemap Generator${NC}"
    echo ""
    echo -e "${MAGENTA}  4)${NC} Collect ALL"
    echo ""
    echo -e "${RED}  0)${NC} Exit"
    echo ""
    echo -e "${WHITE}Enter choices (e.g., 1 2 or 4 for all):${NC} "
}

main() {
    if [ ! -d "$SRC_DIR" ]; then
        echo -e "${RED}ERROR: SRC_DIR not found: $SRC_DIR${NC}"
        echo -e "${YELLOW}Make sure you run this script from the server directory${NC}"
        exit 1
    fi
    
    while true; do
        show_menu
        read -r choices
        
        if [ -z "$choices" ]; then
            continue
        fi
        
        # Handle exit
        if [[ "$choices" == "0" ]]; then
            echo ""
            echo -e "${CYAN}Goodbye!${NC}"
            exit 0
        fi
        
        # Generate output filename based on choices
        local timestamp=$(date '+%Y%m%d-%H%M%S')
        local output_file="$OUT/SERVER-COLLECTION-$timestamp.txt"
        
        # File header
        cat > "$output_file" << EOF
################################################################
##  SERVER — SMART COLLECTION
##  Generated: $(date '+%Y-%m-%d %H:%M:%S')
##  
##  📦 NestJS Backend
##  
##  📂 Collection: Based on user selection
################################################################

EOF
        
        echo ""
        echo -e "${CYAN}Starting collection...${NC}"
        echo ""
        
        # Process choices
        if [[ "$choices" == "4" ]]; then
            # Collect all
            collect_core "$output_file"
            collect_modules "$output_file"
            collect_utils "$output_file"
        else
            # Collect based on selection
            for choice in $choices; do
                case $choice in
                    1) collect_core "$output_file" ;;
                    2) collect_modules "$output_file" ;;
                    3) collect_utils "$output_file" ;;
                    *) echo -e "${RED}Invalid choice: $choice${NC}" ;;
                esac
            done
        fi
        
        # Summary
        echo ""
        echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║  ✅ COLLECTION COMPLETE!                                   ║${NC}"
        echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
        echo ""
        echo -e "${CYAN}📂 Output: $output_file${NC}"
        
        local file_count=$(grep -c "^FILE:" "$output_file" 2>/dev/null || echo "0")
        local file_size=$(du -h "$output_file" 2>/dev/null | cut -f1)
        local total_lines=$(wc -l < "$output_file" 2>/dev/null || echo "0")
        
        echo -e "${CYAN}📊 Files collected: $file_count${NC}"
        echo -e "${CYAN}📄 Total lines: $total_lines${NC}"
        echo -e "${CYAN}📦 Output size: $file_size${NC}"
        echo ""
        
        read -p "Press Enter to continue..."
    done
}

main "$@"