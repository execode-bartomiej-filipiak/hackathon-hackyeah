'use client';

import { useState, useEffect, useRef } from 'react';
import { SearchIcon, MapPinIcon, XIcon, Loader2Icon } from 'lucide-react';
import { cn } from 'cn';

export interface SearchResultItem {
  id: string;
  name: string;
  address: string;
  district: string;
  coordinates: [number, number]; // [lng, lat]
}

interface AddressSearchProps {
  onSelectLocation: (result: SearchResultItem) => void;
  className?: string;
}

export function AddressSearch({ onSelectLocation, className = '' }: AddressSearchProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus inputu po rozwinięciu
  useEffect(() => {
    if (isExpanded) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isExpanded]);

  // Zamykanie listy podpowiedzi i zwijanie po kliknięciu poza komponentem
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsExpanded(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Wyszukiwanie debounced przez Photon API
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const controller = new AbortController();

    const timeoutId = setTimeout(async () => {
      try {
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(
          trimmed
        )}&lat=50.0617&lon=19.9373&limit=5`;

        const res = await fetch(url, { signal: controller.signal });
        if (res.ok) {
          const data = (await res.json()) as {
            features?: Array<{
              geometry: { coordinates: [number, number] };
              properties: {
                osm_id?: number;
                name?: string;
                street?: string;
                housenumber?: string;
                district?: string;
                locality?: string;
                city?: string;
              };
            }>;
          };

          const mapped: SearchResultItem[] = (data.features || [])
            .filter((f) => f.geometry && f.geometry.coordinates)
            .map((f, idx) => {
              const p = f.properties;
              const street = p.street || p.name || 'Kraków';
              const houseNumber = p.housenumber ? ` ${p.housenumber}` : '';
              const fullStreet =
                street.startsWith('ul.') ||
                street.startsWith('Plac') ||
                street.startsWith('Rynek') ||
                street.startsWith('Aleja')
                  ? `${street}${houseNumber}`
                  : `ul. ${street}${houseNumber}`;

              const district = p.district || p.locality || 'Kraków';

              return {
                id: String(p.osm_id || `${idx}_${f.geometry.coordinates[0]}`),
                name: p.name || fullStreet,
                address: fullStreet,
                district,
                coordinates: f.geometry.coordinates,
              };
            });

          setResults(mapped);
          setIsOpen(mapped.length > 0);
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.warn('Błąd wyszukiwania adresu:', err);
        }
      } finally {
        setIsLoading(false);
      }
    }, 280);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [query]);

  const handleSelect = (item: SearchResultItem) => {
    setQuery(item.name || item.address);
    setIsOpen(false);
    setIsExpanded(false);
    onSelectLocation(item);
  };

  const handleCollapse = () => {
    setIsExpanded(false);
    setIsOpen(false);
    setQuery('');
    setResults([]);
  };

  return (
    <div ref={containerRef} className={`relative select-none font-sans ${className}`}>
      {/* PŁYNNIE ROZWIJANY W PRAWO KONTENER WYSZUKIWARKI */}
      <div
        className={cn(
          'flex items-center h-7 rounded-lg border transition-[width,background-color,border-color,box-shadow] duration-300 ease-out overflow-hidden',
          isExpanded
            ? 'w-56 sm:w-64 bg-background/95 border-border/80 shadow-inner ring-1 ring-primary/20'
            : 'w-7 bg-background border-border/80 hover:bg-muted hover:text-foreground cursor-pointer shadow-xs'
        )}
        onClick={() => {
          if (!isExpanded) setIsExpanded(true);
        }}
      >
        <button
          type="button"
          onClick={(e) => {
            if (!isExpanded) {
              setIsExpanded(true);
            } else {
              inputRef.current?.focus();
            }
          }}
          className="size-7 flex items-center justify-center shrink-0 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="Szukaj adresu w Krakowie"
          aria-label="Szukaj adresu w Krakowie"
        >
          {isLoading ? (
            <Loader2Icon className="size-3.5 animate-spin text-primary" />
          ) : (
            <SearchIcon className="size-3.5 text-primary" />
          )}
        </button>

        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              handleCollapse();
            } else if (e.key === 'Enter' && results.length > 0) {
              handleSelect(results[0]);
            }
          }}
          placeholder={isExpanded ? 'Szukaj ulicy...' : ''}
          tabIndex={isExpanded ? 0 : -1}
          className={cn(
            'h-full min-w-0 flex-1 bg-transparent border-none outline-none text-xs font-medium text-foreground placeholder:text-muted-foreground transition-opacity duration-200',
            isExpanded ? 'opacity-100 pr-1' : 'opacity-0 pointer-events-none w-0 p-0'
          )}
        />

        {isExpanded && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleCollapse();
            }}
            className="size-6 mr-1 flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0 rounded hover:bg-muted/60 transition-colors cursor-pointer"
            title="Zamknij wyszukiwarkę"
            aria-label="Zamknij wyszukiwarkę"
          >
            <XIcon className="size-3" />
          </button>
        )}
      </div>

      {/* ROZWIJANA LISTA WYNIKÓW */}
      {isExpanded && isOpen && results.length > 0 && (
        <div className="absolute top-9 left-0 w-64 sm:w-72 z-50 rounded-xl border border-border/80 bg-background/95 backdrop-blur-md shadow-2xl overflow-hidden divide-y divide-border/60 animate-in fade-in slide-in-from-top-1 text-xs">
          {results.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item)}
              className="w-full text-left p-2.5 hover:bg-muted/60 transition-colors flex items-center gap-2 cursor-pointer group"
            >
              <div className="size-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <MapPinIcon className="size-3.5" />
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="font-semibold text-foreground truncate group-hover:text-primary transition-colors text-xs">
                  {item.name}
                </div>
                <div className="text-[10px] text-muted-foreground truncate">
                  {item.address} • <span className="font-medium">{item.district}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
