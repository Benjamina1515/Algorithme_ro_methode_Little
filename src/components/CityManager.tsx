import React, { useState } from 'react';
import { Plus, Trash2, MapPin, ArrowRight } from 'lucide-react';
import { City } from '../App';

interface CityManagerProps {
  onCitiesConfirmed: (cities: City[]) => void;
}

export const CityManager: React.FC<CityManagerProps> = ({ onCitiesConfirmed }) => {
  const [cities, setCities] = useState<City[]>([]);
  const [newCityName, setNewCityName] = useState('');

  const addCity = () => {
    if (!newCityName.trim()) return;
    
    const newCity: City = {
      id: Date.now().toString(),
      name: newCityName.trim()
    };
    
    setCities([...cities, newCity]);
    setNewCityName('');
  };

  const removeCity = (cityId: string) => {
    setCities(cities.filter(city => city.id !== cityId));
  };

  const updateCityName = (cityId: string, newName: string) => {
    setCities(cities.map(city => 
      city.id === cityId ? { ...city, name: newName } : city
    ));
  };

  const handleConfirm = () => {
    if (cities.length < 3) {
      alert('Veuillez saisir au moins 3 villes pour résoudre le TSP.');
      return;
    }
    onCitiesConfirmed(cities);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <div className="flex items-center space-x-3 mb-8">
        <div className="p-2 bg-blue-100 rounded-lg">
          <MapPin className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Définition des villes</h2>
          <p className="text-gray-600 mt-1">
            Ajoutez les villes que le voyageur doit visiter (minimum 3 villes)
          </p>
        </div>
      </div>

      {/* Add new city */}
      <div className="flex space-x-4 mb-8">
        <div className="flex-1">
          <input
            type="text"
            value={newCityName}
            onChange={(e) => setNewCityName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addCity()}
            placeholder="Nom de la ville"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 
                     focus:border-transparent transition-all duration-200"
          />
        </div>
        <button
          onClick={addCity}
          disabled={!newCityName.trim()}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 
                   text-white rounded-lg transition-colors duration-200 flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Ajouter</span>
        </button>
      </div>

      {/* Cities list */}
      <div className="space-y-3 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
          <span>Villes ajoutées ({cities.length})</span>
        </h3>
        
        {cities.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Aucune ville ajoutée</p>
            <p className="text-sm">Commencez par ajouter des villes ci-dessus</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cities.map((city, index) => (
              <div key={city.id} className="flex items-center space-x-3 p-4 border border-gray-200 
                                          rounded-lg hover:border-blue-300 transition-colors duration-200">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                </div>
                
                <input
                  type="text"
                  value={city.name}
                  onChange={(e) => updateCityName(city.id, e.target.value)}
                  className="flex-1 px-3 py-2 border-0 bg-transparent focus:ring-0 focus:outline-none 
                           text-gray-900 font-medium"
                />
                
                <button
                  onClick={() => removeCity(city.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Validation info */}
      {cities.length > 0 && cities.length < 3 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <p className="text-amber-800 text-sm">
            ⚠️ Il faut au moins 3 villes pour résoudre le problème du voyageur de commerce.
            Vous avez actuellement {cities.length} ville{cities.length > 1 ? 's' : ''}.
          </p>
        </div>
      )}

      {cities.length >= 3 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-green-800 text-sm">
            ✓ Parfait ! Vous avez {cities.length} villes. Vous pouvez maintenant passer à l'étape suivante.
          </p>
        </div>
      )}

      {/* Action button */}
      <div className="flex justify-end">
        <button
          onClick={handleConfirm}
          disabled={cities.length < 3}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 
                   text-white rounded-lg transition-colors duration-200 flex items-center space-x-2"
        >
          <span>Continuer vers la matrice des coûts</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};