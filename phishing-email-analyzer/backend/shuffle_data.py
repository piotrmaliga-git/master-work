import json
import random
import argparse

DEFAULT_DATA_PATH = '../../data/data.json'


def load_data(filepath=DEFAULT_DATA_PATH):
    """Wczytaj dane z pliku JSON"""
    with open(filepath, 'r', encoding='utf-8-sig') as f:
        return json.load(f)


def save_data(data, filepath=DEFAULT_DATA_PATH):
    """Zapisz dane do pliku JSON"""
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

def shuffle_emails(data):
    """Tasuj kolejność emaili"""
    random.shuffle(data)
    print(f"✓ Potasowano {len(data)} emaili")
    return data

def renumber_ids(data):
    """Przenumeruj ID'ki po kolei"""
    for i, email in enumerate(data, 1):
        email['id'] = i
    print(f"✓ Przenumerowano {len(data)} emaili")
    return data

def main():
    parser = argparse.ArgumentParser(
        description='Zarządzanie danymi emaili - tasowanie i numerowanie'
    )
    parser.add_argument(
        '-s', '--shuffle',
        action='store_true',
        help='Potasuj kolejność emaili'
    )
    parser.add_argument(
        '-r', '--renumber',
        action='store_true',
        help='Przenumeruj ID emaili od 1'
    )
    parser.add_argument(
        '-a', '--all',
        action='store_true',
        help='Wykonaj obie operacje (tasuj i numeruj)'
    )
    parser.add_argument(
        '-f', '--file',
        default=DEFAULT_DATA_PATH,
        help=f'Ścieżka do pliku JSON (domyślnie: {DEFAULT_DATA_PATH})'
    )
    
    args = parser.parse_args()
    
    # Jeśli nie podano żadnej opcji, domyślnie wykonaj obie operacje
    if not (args.shuffle or args.renumber or args.all):
        args.all = True
    
    # Wczytaj dane
    data = load_data(args.file)
    
    # Wykonaj operacje
    if args.all:
        data = shuffle_emails(data)
        data = renumber_ids(data)
    else:
        if args.shuffle:
            data = shuffle_emails(data)
        if args.renumber:
            data = renumber_ids(data)
    
    # Zapisz dane
    save_data(data, args.file)
    print(f"✓ Zapisano zmiany do {args.file}")

if __name__ == '__main__':
    main()
