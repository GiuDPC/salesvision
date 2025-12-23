import { Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function LanguageSelector() {
    const { i18n } = useTranslation();

    const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        i18n.changeLanguage(e.target.value);
    };

    return (
        <div className="language-selector">
            <Globe size={16} />
            <select
                value={i18n.language}
                onChange={handleLanguageChange}
                className="language-select"
                aria-label="Seleccionar idioma"
            >
                <option value="es">ES</option>
                <option value="en">EN</option>
            </select>
        </div>
    );
}
