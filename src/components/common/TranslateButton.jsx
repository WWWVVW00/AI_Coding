import React, { useState } from 'react';
import { Languages, Loader2 } from 'lucide-react';
import { useTranslation } from '../../contexts/TranslationContext';

function TranslateButton({ 
  text, 
  onTranslated, 
  className = '', 
  size = 'sm',
  variant = 'outline' 
}) {
  const { translateText, currentLanguage, isTranslating } = useTranslation();
  const [isLocalTranslating, setIsLocalTranslating] = useState(false);

  const handleTranslate = async () => {
    if (!text || isLocalTranslating) return;

    try {
      setIsLocalTranslating(true);
      const translatedText = await translateText(text, currentLanguage);
      if (onTranslated) {
        onTranslated(translatedText);
      }
    } catch (error) {
      console.error('翻译失败:', error);
    } finally {
      setIsLocalTranslating(false);
    }
  };

  const sizeClasses = {
    xs: 'p-1',
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3'
  };

  const iconSizes = {
    xs: 'h-3 w-3',
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  const variantClasses = {
    outline: 'border border-gray-300 bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-800',
    ghost: 'bg-transparent hover:bg-gray-100 text-gray-500 hover:text-gray-700',
    solid: 'bg-blue-600 hover:bg-blue-700 text-white'
  };

  return (
    <button
      onClick={handleTranslate}
      disabled={!text || isLocalTranslating || isTranslating}
      className={`
        inline-flex items-center justify-center rounded-md transition-colors
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${className}
      `}
      title="翻译文本"
    >
      {isLocalTranslating ? (
        <Loader2 className={`${iconSizes[size]} animate-spin`} />
      ) : (
        <Languages className={iconSizes[size]} />
      )}
    </button>
  );
}

export default TranslateButton;