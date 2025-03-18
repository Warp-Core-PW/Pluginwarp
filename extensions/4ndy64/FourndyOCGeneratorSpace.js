
class FourndyOCGeneratorSpace {
  constructor() {
    this.traits = {};
    this.currentOC = {
      pronounChoice: null,
      name: '',
      species: '',
      age: '',
      personality: '',
      hairColor: '',
      skill: '',
      weapon: '',
      occupation: '',
      sexuality: ''
    };
    this.traitUrls = {
      species: 'https://raw.githubusercontent.com/andy64lol/4ndy-turbowarp-extensions-/refs/heads/JSON-files/Species.json',
      personality: 'https://raw.githubusercontent.com/andy64lol/4ndy-turbowarp-extensions-/refs/heads/JSON-files/Personality.json',
      hairColor: 'https://raw.githubusercontent.com/andy64lol/4ndy-turbowarp-extensions-/refs/heads/JSON-files/colours.json',
      skill: 'https://raw.githubusercontent.com/andy64lol/4ndy-turbowarp-extensions-/refs/heads/JSON-files/Skills.json',
      weapon: 'https://raw.githubusercontent.com/andy64lol/4ndy-turbowarp-extensions-/refs/heads/JSON-files/weapons.json',
      names: 'https://raw.githubusercontent.com/andy64lol/4ndy-turbowarp-extensions-/refs/heads/JSON-files/Names.json',
      ages: 'https://raw.githubusercontent.com/andy64lol/4ndy-turbowarp-extensions-/refs/heads/JSON-files/age.json',
      occupation: 'https://raw.githubusercontent.com/andy64lol/4ndy-turbowarp-extensions-/refs/heads/JSON-files/occupation.json',
      sexuality: 'https://raw.githubusercontent.com/andy64lol/4ndy-turbowarp-extensions-/refs/heads/JSON-files/Sexuality.json'
    };
    this.loadTraits();
  }

  async loadTraits() {
    for (let trait in this.traitUrls) {
      try {
        const response = await fetch(this.traitUrls[trait]);
        const data = await response.json();
        this.traits[trait] = data;
      } catch (error) {
        this.traits[trait] = ['Data loading failed'];
      }
    }
  }

  getInfo() {
    return {
      id: '4ndyOCGeneratorSpace',
      name: '4ndy OC Generator Space',
      color1: '#003366',
      color2: '#004080',
      color3: '#001F3F',
      blocks: [
        {
          opcode: 'generateOCData',
          blockType: Scratch.BlockType.COMMAND,
          text: 'Generate OC'
        },
        {
          opcode: 'randomGeneratedOC',
          blockType: Scratch.BlockType.REPORTER,
          text: 'Random Generated OC'
        },
        {
          opcode: 'randomizeTrait',
          blockType: Scratch.BlockType.COMMAND,
          text: 'Randomize trait [TRAIT]',
          arguments: {
            TRAIT: {
              type: Scratch.ArgumentType.STRING,
              menu: 'traitsMenu'
            }
          }
        }
      ],
      menus: {
        traitsMenu: {
          acceptReporters: true,
          items: ['name', 'gender', 'species', 'age', 'personality', 'hairColor', 'skill', 'weapon', 'occupation', 'sexuality']
        }
      }
    };
  }

  generateOCData() {
    const randomPick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const pronounSet = [
      { pronoun: 'he', possessive: 'his', subject: 'him' },
      { pronoun: 'she', possessive: 'her', subject: 'her' },
      { pronoun: 'they', possessive: 'their', subject: 'them' }
    ];
    this.currentOC.pronounChoice = randomPick(pronounSet);
    this.currentOC.name = this.randomName();
    this.currentOC.species = randomPick(this.traits.species || ['Human']);
    this.currentOC.age = randomPick(this.traits.ages || ['20']);
    this.currentOC.personality = randomPick(this.traits.personality || ['Brave']);
    this.currentOC.hairColor = randomPick(this.traits.hairColor || ['Black']);
    this.currentOC.skill = randomPick(this.traits.skill || ['Swordsmanship']);
    this.currentOC.weapon = randomPick(this.traits.weapon || ['Sword']);
    this.currentOC.occupation = randomPick(this.traits.occupation || ['Adventurer']);
    this.currentOC.sexuality = randomPick(this.traits.sexuality || ['Straight']);
  }

  randomGeneratedOC() {
    const { pronounChoice, name, species, age, personality, hairColor, skill, weapon, occupation, sexuality } = this.currentOC;
    const weaponPhrase = (weapon.toLowerCase() === 'fist' || weapon.toLowerCase() === 'hands') 
        ? 'fights using bare hands' 
        : `wields a ${weapon}`;

    return pronounChoice
      ? `${name} is ${age} years old and a ${species}. ${pronounChoice.pronoun.charAt(0).toUpperCase() + pronounChoice.pronoun.slice(1)} works as a ${occupation}. With ${pronounChoice.possessive} ${hairColor} hair, a ${personality} personality, and skilled in ${skill}, ${name} ${weaponPhrase}. Sexuality: ${sexuality}.`
      : 'No OC generated yet. Please click "Generate OC" first.';
  }

  randomizeTrait(args) {
    const randomPick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const trait = args.TRAIT.toLowerCase();
    if (this.currentOC.hasOwnProperty(trait)) {
      switch (trait) {
        case 'gender':
          this.currentOC.pronounChoice = randomPick([
            { pronoun: 'he', possessive: 'his', subject: 'him' },
            { pronoun: 'she', possessive: 'her', subject: 'her' },
            { pronoun: 'they', possessive: 'their', subject: 'them' }
          ]);
          break;
        case 'name':
          this.currentOC.name = this.randomName();
          break;
        default:
          this.currentOC[trait] = randomPick(this.traits[trait] || ['Unknown']);
      }
    }
  }

  randomName() {
    const maleNames = ['James', 'Liam', 'Noah', 'Ethan'];
    const femaleNames = ['Olivia', 'Emma', 'Ava', 'Sophia'];
    const neutralNames = ['Alex', 'Jordan', 'Taylor', 'Morgan'];
    const pronoun = this.currentOC.pronounChoice ? this.currentOC.pronounChoice.pronoun : 'they';
    if (pronoun === 'he') return this.randomPick(maleNames);
    if (pronoun === 'she') return this.randomPick(femaleNames);
    return this.randomPick(neutralNames);
  }
}
Scratch.extensions.register(new FourndyOCGeneratorSpace());
