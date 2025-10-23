import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const en = {
  common: {
    searchPlaceholder: 'Search: name / code / tags / category',
    l1: 'Category (L1)',
    l2: 'Subcategory (L2)',
    all: 'All',
    selectL1First: 'Select L1 first',
    tagFilterPlaceholder: 'Tag filter (comma/space separated: traditional, envelope)',
    excludeRestock: 'Exclude “Restock Soon”',
    reset: 'Reset',
    apply: 'Apply',
    facetsTitle: 'Category facets (by tag result)',
    include: 'Include',
    exclude: 'Exclude',
    clearSelection: 'Clear',
    selectedCount: 'Selected',
    total: 'Total',
    shown: 'Shown',
    savedOnly: 'Saved only',
    loading: 'Loading…',
    noResult: 'No results.',
    fetching: 'Fetching…',
    facetAppliedInclude: 'Show only selected categories',
    facetAppliedExclude: 'Exclude selected categories',
    facetCount: 'selected',
  },
  catL1: {
    home_cleaning: 'Home Cleaning/Bath',
    storage: 'Storage/Organization',
    kitchen: 'Kitchen',
    stationery: 'Stationery/Fancy',
    beauty_hygiene: 'Beauty/Hygiene',
    fashion: 'Fashion/Accessories',
    interior_garden: 'Interior/Gardening',
    tools_digital: 'Tools/Digital',
    sports_leisure_hobby: 'Sports/Leisure/Hobby',
    food: 'Food',
    baby_toys: 'Baby/Toys',
    seasonal_series: 'Seasonal/Series',
    best_new: 'Best/New',
    unspecified: '(Unspecified)',
  },
  catL2: {
    // 예시 (필요한 것만 추가; 키는 영어 ID)
    detergents_brushes: 'Detergents/Brushes',
    laundry_racks: 'Laundry Nets/Drying Racks',
    bath_mats_towels: 'Bath Mats/Towels',
    trash_recycle: 'Trash/Recycle',
    // ... 이하 동일
  },
  chips: {
    l1: 'L1',
    l2: 'L2',
    tag: 'Tag',
    search: 'Search',
    facet: 'Facet',
    excludeRestock: 'No Restock',
  }
};

const ko = {
  common: {
    searchPlaceholder: '검색: 상품명 / 코드 / 태그 / 카테고리',
    l1: '대분류(L1)',
    l2: '중분류(L2)',
    all: '전체',
    selectL1First: '대분류 먼저 선택',
    tagFilterPlaceholder: '태그 필터 (쉼표/공백 구분: 전통, 봉투)',
    excludeRestock: '재입고 예정 제외',
    reset: '초기화',
    apply: '적용',
    facetsTitle: '카테고리 파셋 (태그 결과 기준)',
    include: '포함',
    exclude: '제외',
    clearSelection: '선택 해제',
    selectedCount: '개 선택',
    total: '총',
    shown: '표시',
    savedOnly: '저장만 보기',
    loading: '불러오는 중…',
    noResult: '검색/필터 결과가 없습니다.',
    fetching: '불러오는 중…',
    facetAppliedInclude: '선택 카테고리만 표시',
    facetAppliedExclude: '선택 카테고리 제외',
    facetCount: '개',
  },
  // catL1, catL2 한국어 표기는 그대로
};

i18n.use(initReactI18next).init({
  lng: 'en', // 초기 영어
  fallbackLng: 'en',
  resources: { en: { translation: en }, ko: { translation: ko } },
  interpolation: { escapeValue: false }
});

export default i18n;
