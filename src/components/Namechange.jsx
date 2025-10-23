import React from 'react';
import { useLanguage } from './hooks/useLanguage';
import { useLocalizedProductName } from './hooks/useLocalizedProductName';

const ProductList = ({ products }) => {
  const { isKorean, toggleLanguage } = useLanguage();

  return (
    <div>
      <button onClick={toggleLanguage}>
        {isKorean ? '영어로 보기' : '한글로 보기'}
      </button>
      <ul>
        {products.map(product => {
          const name = useLocalizedProductName(product, isKorean);
          return <li key={product.id}>{name}</li>;
        })}
      </ul>
    </div>
  );
};