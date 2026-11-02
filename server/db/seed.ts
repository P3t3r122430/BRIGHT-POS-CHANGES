import bcrypt from 'bcryptjs';
import { runSql, queryOne, queryAll, runTransaction, saveDb } from './database.js';

export interface PhysicalProductSeed {
  cat: string;
  name: string;
  stock: number;
  price: number;
  unit: string;
  cost: number;
}

export const PHYSICAL_PRODUCTS_DATA: PhysicalProductSeed[] = [
  // GEOMETRIC SET
  { cat: 'GEOMETRIC SET', name: 'VEDA', stock: 0, price: 250, unit: 'set', cost: 175 },
  { cat: 'GEOMETRIC SET', name: 'KASUKU', stock: 0, price: 200, unit: 'set', cost: 140 },
  { cat: 'GEOMETRIC SET', name: 'OXFORD', stock: 0, price: 200, unit: 'set', cost: 140 },
  { cat: 'GEOMETRIC SET', name: 'MATHEMATICAL SET', stock: 0, price: 100, unit: 'set', cost: 70 },
  { cat: 'GEOMETRIC SET', name: 'M&G CLEAR SET', stock: 0, price: 230, unit: 'set', cost: 160 },
  { cat: 'GEOMETRIC SET', name: 'M&G METAL SET', stock: 0, price: 250, unit: 'set', cost: 175 },
  { cat: 'GEOMETRIC SET', name: 'ENGINEER SET', stock: 0, price: 1500, unit: 'set', cost: 1050 },

  // CALCULATOR
  { cat: 'CALCULATOR', name: 'CASIO FX-82MS', stock: 0, price: 1050, unit: 'piece', cost: 750 },

  // CRAYONS
  { cat: 'CRAYONS', name: 'M&G 12 COLOURS', stock: 0, price: 80, unit: 'pack', cost: 55 },
  { cat: 'CRAYONS', name: 'M&G 8 COLOURS', stock: 0, price: 50, unit: 'pack', cost: 35 },
  { cat: 'CRAYONS', name: 'VEDA 12 COLOURS', stock: 0, price: 110, unit: 'pack', cost: 75 },
  { cat: 'CRAYONS', name: 'VEDA 8 COLOURS', stock: 0, price: 80, unit: 'pack', cost: 55 },

  // COLOURS
  { cat: 'COLOURS', name: 'WATER COLOUR', stock: 0, price: 170, unit: 'set', cost: 120 },
  { cat: 'COLOURS', name: 'COLOUR PENCIL NATARAJ', stock: 0, price: 180, unit: 'pack', cost: 125 },
  { cat: 'COLOURS', name: 'COLOUR PENCIL LONG M&G', stock: 0, price: 150, unit: 'pack', cost: 105 },
  { cat: 'COLOURS', name: 'COLOUR PENCIL HALF M&G', stock: 0, price: 70, unit: 'pack', cost: 50 },

  // STAPLER
  { cat: 'STAPLER', name: 'STAPLER MEDIUM', stock: 0, price: 500, unit: 'piece', cost: 350 },
  { cat: 'STAPLER', name: 'STAPLER SMALL', stock: 5, price: 0, unit: 'piece', cost: 0 },
  { cat: 'STAPLER', name: 'STAPLER BIG', stock: 3, price: 0, unit: 'piece', cost: 0 },
  { cat: 'STAPLER', name: 'STAPLE PINS 24/6M', stock: 0, price: 60, unit: 'packet', cost: 40 },
  { cat: 'STAPLER', name: 'STAPLES', stock: 45, price: 0, unit: 'boxes', cost: 0 },

  // PAPER PUNCH
  { cat: 'PAPER PUNCH', name: 'PAPER PUNCH MEDIUM', stock: 0, price: 500, unit: 'piece', cost: 350 },
  { cat: 'PAPER PUNCH', name: 'PAPER PUNCH', stock: 1, price: 500, unit: 'piece', cost: 350 },

  // HIGHLIGHTER
  { cat: 'HIGHLIGHTER', name: 'HIGHLIGHTER MARKER0350', stock: 0, price: 50, unit: 'piece', cost: 35 },
  { cat: 'HIGHLIGHTER', name: 'HIGHLIGHTERS', stock: 24, price: 50, unit: 'pcs', cost: 35 },

  // PENS
  { cat: 'PENS', name: 'MARK PEN PERMANENT', stock: 0, price: 50, unit: 'piece', cost: 35 },
  { cat: 'PENS', name: 'PERMANENT MARKERS', stock: 34, price: 50, unit: 'pcs', cost: 35 },
  { cat: 'PENS', name: 'MARK PEN WHITEBOARD', stock: 0, price: 70, unit: 'piece', cost: 50 },
  { cat: 'PENS', name: 'WHITE BOARD MARKER', stock: 10, price: 70, unit: 'pcs', cost: 50 },
  { cat: 'PENS', name: 'J.O BAOKE', stock: 0, price: 80, unit: 'piece', cost: 55 },
  { cat: 'PENS', name: 'ORANGE BIC PACKET', stock: 0, price: 450, unit: 'packet', cost: 315 },
  { cat: 'PENS', name: 'ORANGE BIC', stock: 0, price: 25, unit: 'piece', cost: 18 },
  { cat: 'PENS', name: 'BIC ORANGE RED', stock: 91, price: 25, unit: 'piece', cost: 18 },
  { cat: 'PENS', name: 'BIC ORANGE BLACK', stock: 66, price: 25, unit: 'piece', cost: 18 },
  { cat: 'PENS', name: 'BIC ORANGE BLUE', stock: 67, price: 25, unit: 'piece', cost: 18 },
  { cat: 'PENS', name: 'CRISTAL BIC PACKET', stock: 0, price: 450, unit: 'packet', cost: 315 },
  { cat: 'PENS', name: 'CRISTAL BIC', stock: 0, price: 20, unit: 'piece', cost: 14 },
  { cat: 'PENS', name: 'BIC CRYSTAL BLACK', stock: 122, price: 20, unit: 'piece', cost: 14 },
  { cat: 'PENS', name: 'BIC CRYSTAL RED', stock: 136, price: 20, unit: 'piece', cost: 14 },
  { cat: 'PENS', name: 'BIC CRYSTAL BLUE', stock: 15, price: 20, unit: 'piece', cost: 14 },
  { cat: 'PENS', name: 'OBAMA PACKET', stock: 0, price: 450, unit: 'packet', cost: 315 },
  { cat: 'PENS', name: 'OBAMA', stock: 0, price: 10, unit: 'piece', cost: 7 },
  { cat: 'PENS', name: 'OBAMA BLUE', stock: 52, price: 10, unit: 'piece', cost: 7 },
  { cat: 'PENS', name: 'OBAMA RED', stock: 106, price: 10, unit: 'piece', cost: 7 },
  { cat: 'PENS', name: 'OBAMA BLACK', stock: 53, price: 10, unit: 'piece', cost: 7 },
  { cat: 'PENS', name: 'CHAMPION PACKET', stock: 0, price: 230, unit: 'packet', cost: 160 },
  { cat: 'PENS', name: 'CHAMPION', stock: 0, price: 10, unit: 'piece', cost: 7 },
  { cat: 'PENS', name: 'CHAMPION RED', stock: 34, price: 10, unit: 'piece', cost: 7 },
  { cat: 'PENS', name: 'CHAMPION BLUE', stock: 105, price: 10, unit: 'piece', cost: 7 },
  { cat: 'PENS', name: 'CHAMPION BLACK', stock: 25, price: 10, unit: 'piece', cost: 7 },
  { cat: 'PENS', name: 'TEEPEE PACKET', stock: 0, price: 10, unit: 'packet', cost: 7 },
  { cat: 'PENS', name: 'TEEPEE', stock: 0, price: 10, unit: 'piece', cost: 7 },
  { cat: 'PENS', name: 'TEPEE BLACK', stock: 5, price: 10, unit: 'piece', cost: 7 },
  { cat: 'PENS', name: 'PENCIL PLATINUM PACKET', stock: 0, price: 110, unit: 'packet', cost: 75 },
  { cat: 'PENS', name: 'PENCIL PLATINUM', stock: 0, price: 10, unit: 'piece', cost: 7 },
  { cat: 'PENS', name: 'PLATINUM PENCILS', stock: 120, price: 10, unit: 'piece', cost: 7 },
  { cat: 'PENS', name: 'PENCIL PERIKAN PACKET', stock: 0, price: 260, unit: 'packet', cost: 180 },
  { cat: 'PENS', name: 'PENCIL PERIKAN', stock: 0, price: 25, unit: 'piece', cost: 18 },
  { cat: 'PENS', name: 'PELICAN PENCILS', stock: 21, price: 25, unit: 'piece', cost: 18 },
  { cat: 'PENS', name: 'M&G PENCILS', stock: 214, price: 0, unit: 'piece', cost: 0 },
  { cat: 'PENS', name: 'M&G PENS', stock: 7, price: 0, unit: 'pcs', cost: 0 },
  { cat: 'PENS', name: 'FOUNTAIN PEN', stock: 11, price: 0, unit: 'piece', cost: 0 },
  { cat: 'PENS', name: 'SIGN PEN', stock: 2, price: 0, unit: 'pcs', cost: 0 },

  // RULERS
  { cat: 'RULERS', name: 'RULER', stock: 0, price: 30, unit: 'piece', cost: 20 },
  { cat: 'RULERS', name: 'FLEXIBLE RULER', stock: 0, price: 50, unit: 'piece', cost: 35 },
  { cat: 'RULERS', name: 'ELASTIC RULER', stock: 9, price: 50, unit: 'piece', cost: 35 },
  { cat: 'RULERS', name: 'CLEAR RULER', stock: 6, price: 30, unit: 'piece', cost: 20 },
  { cat: 'RULERS', name: 'HACO RULER', stock: 23, price: 0, unit: 'piece', cost: 0 },

  // BLUSHES
  { cat: 'BLUSHES', name: 'BLUSH', stock: 0, price: 250, unit: 'piece', cost: 175 },

  // ERASER/SHARPENER
  { cat: 'ERASER/SHARPENER', name: 'STUDENT ERASER (SMALL) 45PIECES', stock: 0, price: 10, unit: 'piece', cost: 7 },
  { cat: 'ERASER/SHARPENER', name: 'PERIKAN ERASER BR40', stock: 0, price: 30, unit: 'piece', cost: 20 },
  { cat: 'ERASER/SHARPENER', name: 'NATARAJ ERASER', stock: 0, price: 10, unit: 'piece', cost: 7 },
  { cat: 'ERASER/SHARPENER', name: 'PENCIL SHARPENER', stock: 0, price: 10, unit: 'piece', cost: 7 },
  { cat: 'ERASER/SHARPENER', name: 'CLEAR SHARPENER', stock: 0, price: 5, unit: 'piece', cost: 3 },
  { cat: 'ERASER/SHARPENER', name: 'WHITE OUT 20ML', stock: 0, price: 100, unit: 'piece', cost: 70 },
  { cat: 'ERASER/SHARPENER', name: 'CORRECTION FLUID / WHITE OUT', stock: 15, price: 100, unit: 'pcs', cost: 70 },

  // CHALK
  { cat: 'CHALK', name: 'GROSS CHALK', stock: 0, price: 0, unit: 'box', cost: 0 },
  { cat: 'CHALK', name: 'GROSS CHALK COLOURED', stock: 0, price: 150, unit: 'box', cost: 105 },
  { cat: 'CHALK', name: 'COLOURED CHALK', stock: 6, price: 150, unit: 'box', cost: 105 },
  { cat: 'CHALK', name: 'WHITE CHALK', stock: 3, price: 0, unit: 'box', cost: 0 },

  // TAPES
  { cat: 'TAPES', name: 'MASKING TAPE 3 PCS', stock: 1, price: 100, unit: 'piece', cost: 70 },
  { cat: 'TAPES', name: 'MASKING TAPE 6 PCS', stock: 0, price: 60, unit: 'piece', cost: 40 },
  { cat: 'TAPES', name: 'MASKING TAPE 8 PCS', stock: 16, price: 40, unit: 'piece', cost: 28 },
  { cat: 'TAPES', name: 'MASKING TAPE 12 PCS', stock: 18, price: 20, unit: 'piece', cost: 14 },
  { cat: 'TAPES', name: 'PVC TAPE', stock: 0, price: 200, unit: 'roll', cost: 140 },
  { cat: 'TAPES', name: 'SELOTAPE 3 PCS', stock: 0, price: 0, unit: 'piece', cost: 0 },
  { cat: 'TAPES', name: 'SELOTAPE 6 PCS', stock: 6, price: 50, unit: 'piece', cost: 35 },
  { cat: 'TAPES', name: 'SELOTAPE 8 PCS', stock: 24, price: 30, unit: 'piece', cost: 20 },
  { cat: 'TAPES', name: 'SELOTAPE 12 PCS', stock: 40, price: 15, unit: 'piece', cost: 10 },
  { cat: 'TAPES', name: 'BINDING TAPE', stock: 5, price: 300, unit: 'roll', cost: 210 },
  { cat: 'TAPES', name: 'ELECTRICAL TAPE', stock: 0, price: 30, unit: 'roll', cost: 20 },

  // GLUE
  { cat: 'GLUE', name: 'GLUE STICK 22GRAM', stock: 0, price: 200, unit: 'piece', cost: 140 },
  { cat: 'GLUE', name: 'OFFICE GLUE 160GRAMS', stock: 0, price: 70, unit: 'piece', cost: 50 },
  { cat: 'GLUE', name: 'OFFICE GLUE 90 GRAM', stock: 0, price: 40, unit: 'piece', cost: 28 },
  { cat: 'GLUE', name: 'GLUE STICK 11 GRAM', stock: 0, price: 150, unit: 'piece', cost: 105 },
  { cat: 'GLUE', name: 'PRITT 11GM', stock: 6, price: 150, unit: 'piece', cost: 105 },

  // LETO INK
  { cat: 'LETO INK', name: 'LETO INK 45 ML', stock: 0, price: 150, unit: 'piece', cost: 105 },
  { cat: 'LETO INK', name: 'LETO INK', stock: 11, price: 150, unit: 'piece', cost: 105 },

  // SCRAP BOOK
  { cat: 'SCRAP BOOK', name: '10PGS', stock: 0, price: 150, unit: 'book', cost: 105 },
  { cat: 'SCRAP BOOK', name: 'KASUKU 20PGS', stock: 0, price: 240, unit: 'book', cost: 165 },
  { cat: 'SCRAP BOOK', name: 'VEDA 20PGS', stock: 0, price: 200, unit: 'book', cost: 140 },
  { cat: 'SCRAP BOOK', name: 'SCRAP BOOK 20PCS', stock: 6, price: 0, unit: 'piece', cost: 0 },

  // FILES
  { cat: 'FILES', name: 'BOX FILE', stock: 0, price: 300, unit: 'piece', cost: 210 },
  { cat: 'FILES', name: 'SPRING FILE', stock: 0, price: 70, unit: 'piece', cost: 50 },
  { cat: 'FILES', name: 'FASTENER FILES', stock: 0, price: 100, unit: 'pack', cost: 70 },
  { cat: 'FILES', name: 'PORTFOLIO (CLEAR BOOK) 10 POCKET', stock: 0, price: 200, unit: 'piece', cost: 140 },

  // CARBON
  { cat: 'CARBON', name: 'CARBON PAPER', stock: 0, price: 20, unit: 'sheet', cost: 14 },

  // FULL SCAP
  { cat: 'FULL SCAP', name: 'LOOSE LEAF', stock: 0, price: 100, unit: 'packet', cost: 70 },
  { cat: 'FULL SCAP', name: 'FULL SCAP SLEEVE', stock: 2, price: 0, unit: 'sleeve', cost: 0 },

  // CASH SALE
  { cat: 'CASH SALE', name: '8 UP', stock: 0, price: 80, unit: 'book', cost: 55 },
  { cat: 'CASH SALE', name: '6 UP', stock: 0, price: 80, unit: 'book', cost: 55 },
  { cat: 'CASH SALE', name: 'RECEIPT BOOK 6UP', stock: 12, price: 80, unit: 'book', cost: 55 },
  { cat: 'CASH SALE', name: 'RECEIPT BOOK', stock: 3, price: 0, unit: 'book', cost: 0 },

  // COVERS
  { cat: 'COVERS', name: 'ROLL', stock: 0, price: 150, unit: 'roll', cost: 105 },
  { cat: 'COVERS', name: 'A4 PACKET', stock: 0, price: 200, unit: 'packet', cost: 140 },
  { cat: 'COVERS', name: 'A4 PIECE', stock: 0, price: 20, unit: 'piece', cost: 14 },
  { cat: 'COVERS', name: 'A5 PACKET', stock: 0, price: 150, unit: 'packet', cost: 105 },
  { cat: 'COVERS', name: 'A5 PIECE', stock: 0, price: 15, unit: 'piece', cost: 10 },

  // CONTINUOUS PAPER
  { cat: 'CONTINUOUS PAPER', name: 'HARD', stock: 0, price: 100, unit: 'ream', cost: 70 },
  { cat: 'CONTINUOUS PAPER', name: 'SOFT', stock: 0, price: 50, unit: 'ream', cost: 35 },

  // MANILLA
  { cat: 'MANILLA', name: 'MANILLA PAPER', stock: 0, price: 30, unit: 'sheet', cost: 20 },

  // NOTEBOOK
  { cat: 'NOTEBOOK', name: 'A5 NOTE BOOK SPRING', stock: 0, price: 70, unit: 'book', cost: 50 },
  { cat: 'NOTEBOOK', name: 'A6 NOTEBOOK SPRING', stock: 0, price: 50, unit: 'book', cost: 35 },
  { cat: 'NOTEBOOK', name: 'A7 HAND COVER NOTE BOOK', stock: 0, price: 50, unit: 'book', cost: 35 },
  { cat: 'NOTEBOOK', name: 'A5 J25', stock: 0, price: 300, unit: 'book', cost: 210 },
  { cat: 'NOTEBOOK', name: 'DIARY 2024', stock: 0, price: 200, unit: 'book', cost: 140 },
  { cat: 'NOTEBOOK', name: 'A5 KASUKU NOTEBOOK', stock: 27, price: 0, unit: 'book', cost: 0 },
  { cat: 'NOTEBOOK', name: 'A5 JOS NOTEBOOK', stock: 1, price: 0, unit: 'book', cost: 0 },
  { cat: 'NOTEBOOK', name: 'A5 PLAIN BOOK – 96 PAGES', stock: 172, price: 0, unit: 'book', cost: 0 },
  { cat: 'NOTEBOOK', name: 'A5 SINGLE LINED – 200 PAGES', stock: 77, price: 0, unit: 'book', cost: 0 },

  // HARD COVERS
  { cat: 'HARD COVERS', name: 'A5 KASUKU HARD COVER', stock: 0, price: 150, unit: 'book', cost: 105 },
  { cat: 'HARD COVERS', name: 'A4 1 QUIRE', stock: 0, price: 180, unit: 'book', cost: 125 },
  { cat: 'HARD COVERS', name: 'A4 2 QUIRE', stock: 0, price: 240, unit: 'book', cost: 165 },
  { cat: 'HARD COVERS', name: 'A4 3 QUIRE', stock: 0, price: 320, unit: 'book', cost: 220 },
  { cat: 'HARD COVERS', name: 'A4 4 QUIRE', stock: 0, price: 420, unit: 'book', cost: 290 },
  { cat: 'HARD COVERS', name: 'A6 HARD COVER', stock: 15, price: 0, unit: 'book', cost: 0 },
  { cat: 'HARD COVERS', name: 'A5 HARD COVER', stock: 24, price: 0, unit: 'book', cost: 0 },

  // EXERCISE BOOKS
  { cat: 'EXERCISE BOOKS', name: 'A4 200 PGS', stock: 0, price: 130, unit: 'book', cost: 90 },
  { cat: 'EXERCISE BOOKS', name: 'A4 120 PGS', stock: 0, price: 90, unit: 'book', cost: 60 },
  { cat: 'EXERCISE BOOKS', name: 'A4 96 PGS', stock: 0, price: 80, unit: 'book', cost: 55 },
  { cat: 'EXERCISE BOOKS', name: 'A4 80 PGS', stock: 0, price: 70, unit: 'book', cost: 50 },
  { cat: 'EXERCISE BOOKS', name: 'A5 200 PGS', stock: 0, price: 70, unit: 'book', cost: 50 },
  { cat: 'EXERCISE BOOKS', name: 'A5 120 PGS', stock: 0, price: 55, unit: 'book', cost: 38 },
  { cat: 'EXERCISE BOOKS', name: 'A5 80 PGS', stock: 0, price: 40, unit: 'book', cost: 28 },
  { cat: 'EXERCISE BOOKS', name: 'A4 GRAPH BOOK 96PG', stock: 75, price: 80, unit: 'book', cost: 55 },
  { cat: 'EXERCISE BOOKS', name: 'A4 DRAWING BOOK 96 PGS', stock: 0, price: 80, unit: 'book', cost: 55 },
  { cat: 'EXERCISE BOOKS', name: 'A5 DRAWING BOOK 96 PGS', stock: 0, price: 50, unit: 'book', cost: 35 },
  { cat: 'EXERCISE BOOKS', name: 'A5 1/2 INCH BOOK 96 PGS', stock: 129, price: 50, unit: 'book', cost: 35 },
  { cat: 'EXERCISE BOOKS', name: 'A5 1/2 INCH BOOK 48 PGS', stock: 263, price: 30, unit: 'book', cost: 20 },
  { cat: 'EXERCISE BOOKS', name: 'A4 200 PAGES MATHS', stock: 42, price: 130, unit: 'book', cost: 90 },
  { cat: 'EXERCISE BOOKS', name: 'A4 120 PAGES SQUARE RULED', stock: 72, price: 90, unit: 'book', cost: 60 },
  { cat: 'EXERCISE BOOKS', name: 'A4 120 PAGES SINGLE LINE', stock: 43, price: 90, unit: 'book', cost: 60 },
  { cat: 'EXERCISE BOOKS', name: 'A4 PLAIN BOOK – 96 PAGES', stock: 98, price: 80, unit: 'book', cost: 55 },
  { cat: 'EXERCISE BOOKS', name: 'A4 SINGLE LINE – 96 PAGES', stock: 71, price: 80, unit: 'book', cost: 55 },
  { cat: 'EXERCISE BOOKS', name: 'A4 SINGLE LINE – 80 PAGES', stock: 54, price: 70, unit: 'book', cost: 50 },
  { cat: 'EXERCISE BOOKS', name: 'A4 9 SQUARED RULED – 80 PAGES', stock: 125, price: 70, unit: 'book', cost: 50 },

  // REAM
  { cat: 'REAM', name: 'JK', stock: 0, price: 850, unit: 'ream', cost: 600 },
  { cat: 'REAM', name: 'AONE', stock: 0, price: 800, unit: 'ream', cost: 560 },

  // LOG BOOK
  { cat: 'LOG BOOK', name: 'LOG BOOK', stock: 0, price: 450, unit: 'book', cost: 315 },

  // MODELLING
  { cat: 'MODELLING', name: 'M&G 500 MODELLING CLAY', stock: 0, price: 200, unit: 'pack', cost: 140 },
  { cat: 'MODELLING', name: 'VEDA 500G MODELLING CLAY', stock: 0, price: 250, unit: 'pack', cost: 175 },
  { cat: 'MODELLING', name: 'M&G 100G MODELLING CLAY', stock: 0, price: 100, unit: 'pack', cost: 70 },
  { cat: 'MODELLING', name: 'VEDA 100G MODELLING CLAY', stock: 0, price: 130, unit: 'pack', cost: 90 },

  // COUNTER BOOK
  { cat: 'COUNTER BOOK', name: 'COUNTER BOOK – 1 QUIRE', stock: 2, price: 0, unit: 'book', cost: 0 },
  { cat: 'COUNTER BOOK', name: 'COUNTER BOOK – 2 QUIRE', stock: 20, price: 0, unit: 'book', cost: 0 },
  { cat: 'COUNTER BOOK', name: 'COUNTER BOOK – 3 QUIRE', stock: 20, price: 0, unit: 'book', cost: 0 },
  { cat: 'COUNTER BOOK', name: 'COUNTER BOOK – 4 QUIRE', stock: 18, price: 0, unit: 'book', cost: 0 },
  { cat: 'COUNTER BOOK', name: 'COUNTER BOOK – 6 QUIRE', stock: 12, price: 0, unit: 'book', cost: 0 },

  // BOOKS
  { cat: 'BOOKS', name: 'GOOD NEWS BIBLE', stock: 5, price: 0, unit: 'book', cost: 0 },
  { cat: 'BOOKS', name: 'HOLY BIBLE', stock: 2, price: 0, unit: 'book', cost: 0 },
  { cat: 'BOOKS', name: 'KAMUSI YA KARNE', stock: 21, price: 0, unit: 'book', cost: 0 },
  { cat: 'BOOKS', name: 'HOLY BIBLE NIV', stock: 1, price: 0, unit: 'book', cost: 0 },
  { cat: 'BOOKS', name: 'OXFORD 360 ATLAS', stock: 5, price: 0, unit: 'book', cost: 0 },
  { cat: 'BOOKS', name: 'GOLDEN BELLS', stock: 4, price: 0, unit: 'book', cost: 0 },
  { cat: 'BOOKS', name: 'FOUR FIGURE MATHEMATICAL TABLE', stock: 6, price: 0, unit: 'book', cost: 0 },

  // OTHER
  { cat: 'OTHER', name: 'OXFORD', stock: 1, price: 0, unit: 'piece', cost: 0 },

  // ==========================================
  // PHONE ACCESSORIES, GADGETS & ELECTRONICS
  // ==========================================

  // CAR CHARGER
  { cat: 'CAR CHARGER', name: 'Car Charger - Samsung', stock: 1, price: 800, unit: 'piece', cost: 560 },
  { cat: 'CAR CHARGER', name: 'Car Charger - Original 3.1', stock: 1, price: 300, unit: 'piece', cost: 210 },

  // OTG
  { cat: 'OTG', name: 'OTG - Type C', stock: 3, price: 50, unit: 'piece', cost: 35 },
  { cat: 'OTG', name: 'OTG - Type B', stock: 12, price: 50, unit: 'piece', cost: 35 },
  { cat: 'OTG', name: 'OTG - Connect Kit Type C', stock: 3, price: 100, unit: 'piece', cost: 70 },
  { cat: 'OTG', name: 'OTG - 2 in 1', stock: 1, price: 150, unit: 'piece', cost: 105 },
  { cat: 'OTG', name: 'OTG - Card Reader', stock: 17, price: 50, unit: 'piece', cost: 35 },

  // FLASH DRIVE
  { cat: 'FLASH DRIVE', name: 'Flash Drive - 2 GB', stock: 1, price: 450, unit: 'piece', cost: 315 },
  { cat: 'FLASH DRIVE', name: 'Flash Drive - 4 GB', stock: 1, price: 550, unit: 'piece', cost: 385 },
  { cat: 'FLASH DRIVE', name: 'Flash Drive - 8 GB', stock: 1, price: 650, unit: 'piece', cost: 455 },
  { cat: 'FLASH DRIVE', name: 'Flash Drive - 16 GB', stock: 1, price: 750, unit: 'piece', cost: 525 },

  // MEMORY CARD
  { cat: 'MEMORY CARD', name: 'Memory Card - 8 GB', stock: 2, price: 600, unit: 'piece', cost: 420 },

  // SIM EJECTOR
  { cat: 'SIM EJECTOR', name: 'SIM Ejector Pin', stock: 9, price: 20, unit: 'piece', cost: 10 },

  // BATTERY
  { cat: 'BATTERY', name: 'Battery - Techno copy', stock: 1, price: 150, unit: 'piece', cost: 100 },
  { cat: 'BATTERY', name: 'Battery - Universal (Assorted)', stock: 2, price: 450, unit: 'piece', cost: 300 },

  // PHONES
  { cat: 'PHONES', name: 'Phone - Rapno R87', stock: 1, price: 1100, unit: 'piece', cost: 850 },
  { cat: 'PHONES', name: 'Phone - Momofy M312E', stock: 1, price: 1000, unit: 'piece', cost: 750 },
  { cat: 'PHONES', name: 'Phone - Cherish A3061', stock: 1, price: 1200, unit: 'piece', cost: 900 },
  { cat: 'PHONES', name: 'Phone - Flip E1190', stock: 1, price: 1600, unit: 'piece', cost: 1200 },
  { cat: 'PHONES', name: 'Phone - Bontel Explorer 100', stock: 1, price: 1500, unit: 'piece', cost: 1100 },
  { cat: 'PHONES', name: 'Phone - Itel 2165', stock: 1, price: 1600, unit: 'piece', cost: 1200 },
  { cat: 'PHONES', name: 'Phone - Nokia 105', stock: 1, price: 1700, unit: 'piece', cost: 1300 },

  // PHOTO FRAME
  { cat: 'PHOTO FRAME', name: 'Photo Frame', stock: 5, price: 750, unit: 'piece', cost: 500 },

  // POWER BANK
  { cat: 'POWER BANK', name: 'Power Bank - Oraimo Original 10,000 mAh', stock: 1, price: 3000, unit: 'piece', cost: 2200 },
  { cat: 'POWER BANK', name: 'Power Bank - Oraimo 5,000 mAh', stock: 1, price: 500, unit: 'piece', cost: 350 },
  { cat: 'POWER BANK', name: 'Power Bank - Amaya 10,000 mAh', stock: 1, price: 2500, unit: 'piece', cost: 1800 },

  // MOUSE
  { cat: 'MOUSE', name: 'Wireless Mouse B', stock: 1, price: 850, unit: 'piece', cost: 600 },

  // SMART WATCH
  { cat: 'SMART WATCH', name: 'Smart Watch W008', stock: 1, price: 2000, unit: 'piece', cost: 1400 },

  // CHARGER TYPE B
  { cat: 'CHARGER TYPE B', name: 'Charger Type B - Amaya 3.1A (4-Pack Stock)', stock: 4, price: 350, unit: 'piece', cost: 240 },
  { cat: 'CHARGER TYPE B', name: 'Charger Type B - Techno', stock: 1, price: 250, unit: 'piece', cost: 170 },
  { cat: 'CHARGER TYPE B', name: 'Charger Type B - ABJ 3.1A', stock: 4, price: 250, unit: 'piece', cost: 170 },
  { cat: 'CHARGER TYPE B', name: 'Charger Type B - ABJ 45 Watts', stock: 2, price: 300, unit: 'piece', cost: 200 },
  { cat: 'CHARGER TYPE B', name: 'Charger Type B - Support Fast Charger', stock: 2, price: 250, unit: 'piece', cost: 170 },
  { cat: 'CHARGER TYPE B', name: 'Charger Type B - Hoyan 3.1A', stock: 5, price: 500, unit: 'piece', cost: 350 },
  { cat: 'CHARGER TYPE B', name: 'Charger Type B - 3G Power', stock: 3, price: 100, unit: 'piece', cost: 70 },
  { cat: 'CHARGER TYPE B', name: 'Charger Type B - Amaya 2.4A', stock: 11, price: 250, unit: 'piece', cost: 170 },
  { cat: 'CHARGER TYPE B', name: 'Charger Type B - Amaya 3.1A', stock: 2, price: 350, unit: 'piece', cost: 240 },
  { cat: 'CHARGER TYPE B', name: 'Charger Type B - Itel 5 Watts', stock: 4, price: 500, unit: 'piece', cost: 350 },
  { cat: 'CHARGER TYPE B', name: 'Charger Type B - Oraimo 2A', stock: 3, price: 700, unit: 'piece', cost: 490 },
  { cat: 'CHARGER TYPE B', name: 'Charger Type B - Excellent', stock: 2, price: 650, unit: 'piece', cost: 450 },

  // EARPHONES
  { cat: 'EARPHONES', name: 'Earphones - Dr Lee', stock: 4, price: 100, unit: 'piece', cost: 70 },
  { cat: 'EARPHONES', name: 'Earphones - Oraimo copy (Strong Base)', stock: 5, price: 150, unit: 'piece', cost: 100 },
  { cat: 'EARPHONES', name: 'Earphones - Oraimo Trumpet', stock: 2, price: 200, unit: 'piece', cost: 140 },
  { cat: 'EARPHONES', name: 'Earphones - Oraimo Superior Base', stock: 4, price: 350, unit: 'piece', cost: 240 },
  { cat: 'EARPHONES', name: 'Earphones - Amaya', stock: 5, price: 150, unit: 'piece', cost: 100 },
  { cat: 'EARPHONES', name: 'Earphones - O-Fia', stock: 11, price: 200, unit: 'piece', cost: 140 },
  { cat: 'EARPHONES', name: 'Earphones - Samsung', stock: 4, price: 300, unit: 'piece', cost: 200 },
  { cat: 'EARPHONES', name: 'Earphones - Necklace KS 201 Oraimo', stock: 1, price: 700, unit: 'piece', cost: 490 },
  { cat: 'EARPHONES', name: 'Earphones - Necklace Oraimo KS 102', stock: 1, price: 900, unit: 'piece', cost: 630 },
  { cat: 'EARPHONES', name: 'Earphones - Oraimo Neckhead Set', stock: 1, price: 1500, unit: 'piece', cost: 1050 },
  { cat: 'EARPHONES', name: 'Earphones - Wireless Earpods M10', stock: 1, price: 1000, unit: 'piece', cost: 700 },
  { cat: 'EARPHONES', name: 'Earphones - Wireless Earpods I15', stock: 1, price: 800, unit: 'piece', cost: 560 },
  { cat: 'EARPHONES', name: 'Earphones - Wireless Earpods I12', stock: 1, price: 600, unit: 'piece', cost: 420 },

  // HEADPHONES
  { cat: 'HEADPHONES', name: 'Headphones - Plush Fluffy', stock: 2, price: 1800, unit: 'piece', cost: 1250 },
  { cat: 'HEADPHONES', name: 'Headphones - JBL', stock: 1, price: 1500, unit: 'piece', cost: 1050 },
  { cat: 'HEADPHONES', name: 'Headphones - Sony', stock: 1, price: 1500, unit: 'piece', cost: 1050 },
  { cat: 'HEADPHONES', name: 'Headphones - PHT-701', stock: 1, price: 800, unit: 'piece', cost: 550 },

  // CABLES
  { cat: 'CABLES', name: 'Cable - USB Multi-charge (3 in 1)', stock: 2, price: 250, unit: 'piece', cost: 170 },
  { cat: 'CABLES', name: 'Cable - Normal Cable Type B', stock: 4, price: 100, unit: 'piece', cost: 70 },
  { cat: 'CABLES', name: 'Cable - ABJ Cable Type B', stock: 2, price: 150, unit: 'piece', cost: 100 },
  { cat: 'CABLES', name: 'Cable - Oraimo Cable Type B copy', stock: 5, price: 150, unit: 'piece', cost: 100 },
  { cat: 'CABLES', name: 'Cable - Amaya Cable Type B', stock: 6, price: 200, unit: 'piece', cost: 140 },
  { cat: 'CABLES', name: 'Cable - Oraimo Original Type B', stock: 4, price: 200, unit: 'piece', cost: 140 },
  { cat: 'CABLES', name: 'Cable - Amaya Type C copy', stock: 7, price: 150, unit: 'piece', cost: 100 },
  { cat: 'CABLES', name: 'Cable - Amaya Original Type C', stock: 5, price: 250, unit: 'piece', cost: 170 },
  { cat: 'CABLES', name: 'Cable - Oraimo copy Type C', stock: 3, price: 150, unit: 'piece', cost: 100 },
  { cat: 'CABLES', name: 'Cable - Oraimo Original Type C', stock: 4, price: 250, unit: 'piece', cost: 170 },
  { cat: 'CABLES', name: 'Cable - Oraimo Ultra Type C', stock: 2, price: 350, unit: 'piece', cost: 240 },
  { cat: 'CABLES', name: 'Cable - Punex Type C', stock: 3, price: 250, unit: 'piece', cost: 170 },
  { cat: 'CABLES', name: 'Cable - Punex Type B', stock: 2, price: 250, unit: 'piece', cost: 170 },
  { cat: 'CABLES', name: 'Cable - Punex iPhone Lightning', stock: 2, price: 250, unit: 'piece', cost: 170 },
  { cat: 'CABLES', name: 'Cable - Excellent Type B', stock: 2, price: 250, unit: 'piece', cost: 170 },
  { cat: 'CABLES', name: 'Cable - Reamep Type C', stock: 3, price: 200, unit: 'piece', cost: 140 },
  { cat: 'CABLES', name: 'Cable - Samsung C to C', stock: 3, price: 450, unit: 'piece', cost: 300 },

  // CHARGER TYPE C
  { cat: 'CHARGER TYPE C', name: 'Charger Type C - Amaya 2A', stock: 1, price: 450, unit: 'piece', cost: 300 },
  { cat: 'CHARGER TYPE C', name: 'Charger Type C - Amaya 3.1A', stock: 2, price: 450, unit: 'piece', cost: 300 },
  { cat: 'CHARGER TYPE C', name: 'Charger Type C - Aldeepro 3.1A', stock: 1, price: 400, unit: 'piece', cost: 280 },
  { cat: 'CHARGER TYPE C', name: 'Charger Type C - Aldeepro 30 Watts', stock: 3, price: 900, unit: 'piece', cost: 600 },
  { cat: 'CHARGER TYPE C', name: 'Charger Type C - Excellent Fast Charger', stock: 4, price: 800, unit: 'piece', cost: 550 },
  { cat: 'CHARGER TYPE C', name: 'Charger Type C - Oraimo 2A', stock: 1, price: 800, unit: 'piece', cost: 550 },
  { cat: 'CHARGER TYPE C', name: 'Charger Type C - Samsung 25 Watts (C to C)', stock: 2, price: 1200, unit: 'piece', cost: 850 },
  { cat: 'CHARGER TYPE C', name: 'Charger Type C - Samsung 35 Watts (C to C)', stock: 1, price: 1300, unit: 'piece', cost: 900 },

  // ADAPTER
  { cat: 'ADAPTER', name: 'Adapter - Hoyan copy', stock: 4, price: 200, unit: 'piece', cost: 140 },
  { cat: 'ADAPTER', name: 'Adapter - Original Single Port', stock: 0, price: 200, unit: 'piece', cost: 140 },
  { cat: 'ADAPTER', name: 'Adapter - Hyper 120 Watts Super Fast', stock: 2, price: 500, unit: 'piece', cost: 350 },
  { cat: 'ADAPTER', name: 'Adapter - Hoyan Original', stock: 1, price: 450, unit: 'piece', cost: 300 },
  { cat: 'ADAPTER', name: 'Adapter - Travel Adapter 4 Ports', stock: 2, price: 450, unit: 'piece', cost: 300 },
  { cat: 'ADAPTER', name: 'Adapter - Samsung Type-C Port 25W', stock: 1, price: 700, unit: 'piece', cost: 500 },
  { cat: 'ADAPTER', name: 'Adapter - Samsung Type-C Port 45W', stock: 1, price: 900, unit: 'piece', cost: 650 },
];

export async function resetAndSeedPhysicalProducts(): Promise<void> {
  const now = new Date().toISOString();

  runTransaction(() => {
    // 1. Delete all existing physical products and their inventory movements
    runSql('DELETE FROM inventory_movements WHERE product_id IS NOT NULL');
    runSql('DELETE FROM price_history WHERE entity_type = "product"');
    runSql('DELETE FROM products');

    // 2. Ensure all physical product categories exist
    const categoryNames = Array.from(new Set(PHYSICAL_PRODUCTS_DATA.map((p) => p.cat)));
    const catIdMap: Record<string, number> = {};

    for (const name of categoryNames) {
      const existing = queryOne<{ id: number }>('SELECT id FROM categories WHERE name = ?', [name]);
      if (existing) {
        catIdMap[name] = existing.id;
        runSql('UPDATE categories SET type = "product", active = 1, updated_at = ? WHERE id = ?', [now, existing.id]);
      } else {
        const res = runSql(
          `INSERT INTO categories (name, type, active, created_at, updated_at) VALUES (?, 'product', 1, ?, ?)`,
          [name, now, now]
        );
        catIdMap[name] = res.lastInsertRowid;
      }
    }

    // 3. Insert all products exactly as specified
    let skuCounter = 100;
    for (const p of PHYSICAL_PRODUCTS_DATA) {
      skuCounter++;
      const catId = catIdMap[p.cat];
      const cleanSkuName = p.name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 5).toUpperCase() || 'ITEM';
      const cleanCatCode = p.cat.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() || 'CAT';
      const sku = `PRD-${cleanCatCode}-${cleanSkuName}-${skuCounter}`;

      const pRes = runSql(
        `INSERT INTO products (
          sku, barcode, name, description, category_id, cost_price, selling_price,
          stock_quantity, minimum_stock, unit, supplier, active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Kasuku & Nairobi Stationers / Electronics Supply', 1, ?, ?)`,
        [sku, null, p.name, `${p.cat} - Physical inventory item`, catId, p.cost, p.price, p.stock, 5, p.unit, now, now]
      );

      const newId = pRes.lastInsertRowid;

      if (p.stock > 0) {
        runSql(
          `INSERT INTO inventory_movements (
            product_id, movement_type, quantity, previous_quantity, new_quantity, reason, user_id, created_at
          ) VALUES (?, 'restock', ?, 0, ?, 'Physical stock registration', 1, ?)`,
          [newId, p.stock, p.stock, now]
        );
      }
    }
  });

  saveDb();
  console.log(`Cleared and seeded exactly ${PHYSICAL_PRODUCTS_DATA.length} physical products in database.`);
}

export async function syncPhysicalProducts(): Promise<void> {
  const now = new Date().toISOString();

  runTransaction(() => {
    // 1. Ensure all physical product categories exist
    const categoryNames = Array.from(new Set(PHYSICAL_PRODUCTS_DATA.map((p) => p.cat)));
    const catIdMap: Record<string, number> = {};

    for (const name of categoryNames) {
      const existing = queryOne<{ id: number }>('SELECT id FROM categories WHERE name = ?', [name]);
      if (existing) {
        catIdMap[name] = existing.id;
        runSql('UPDATE categories SET type = "product", active = 1, updated_at = ? WHERE id = ?', [now, existing.id]);
      } else {
        const res = runSql(
          `INSERT INTO categories (name, type, active, created_at, updated_at) VALUES (?, 'product', 1, ?, ?)`,
          [name, now, now]
        );
        catIdMap[name] = res.lastInsertRowid;
      }
    }

    // 2. Insert any missing products from PHYSICAL_PRODUCTS_DATA
    let skuCounter = 100;
    let addedCount = 0;

    for (const p of PHYSICAL_PRODUCTS_DATA) {
      skuCounter++;
      const catId = catIdMap[p.cat];
      const existing = queryOne<{ id: number; name: string }>('SELECT id, name FROM products WHERE name = ? OR (name LIKE ? AND category_id = ?)', [p.name, p.name, catId]);

      if (!existing) {
        const cleanSkuName = p.name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 5).toUpperCase() || 'ITEM';
        const cleanCatCode = p.cat.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() || 'CAT';
        const sku = `PRD-${cleanCatCode}-${cleanSkuName}-${skuCounter}`;

        const pRes = runSql(
          `INSERT INTO products (
            sku, barcode, name, description, category_id, cost_price, selling_price,
            stock_quantity, minimum_stock, unit, supplier, active, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Kasuku & Nairobi Stationers / Electronics Supply', 1, ?, ?)`,
          [sku, null, p.name, `${p.cat} - Physical inventory item`, catId, p.cost, p.price, p.stock, 5, p.unit, now, now]
        );

        const newId = pRes.lastInsertRowid;
        addedCount++;

        if (p.stock > 0) {
          runSql(
            `INSERT INTO inventory_movements (
              product_id, movement_type, quantity, previous_quantity, new_quantity, reason, user_id, created_at
            ) VALUES (?, 'restock', ?, 0, ?, 'Initial inventory stock registration', 1, ?)`,
            [newId, p.stock, p.stock, now]
          );
        }
      }
    }

    if (addedCount > 0) {
      console.log(`[SYNC] Added ${addedCount} new physical products to database.`);
    }
  });

  saveDb();
}

export async function ensurePhysicalProductsSeeded(): Promise<void> {
  const countRow = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM products');
  const currentCount = countRow ? countRow.count : 0;

  if (currentCount < PHYSICAL_PRODUCTS_DATA.length) {
    console.log(`Current product count (${currentCount}) is less than master list (${PHYSICAL_PRODUCTS_DATA.length}). Syncing physical products...`);
    await syncPhysicalProducts();
  } else {
    console.log(`Physical products database is up to date (${currentCount} items).`);
  }
}

export async function seedDatabase(): Promise<void> {
  const now = new Date().toISOString();
  const saltRounds = 10;

  // Only seed default admin if no admin accounts exist in database
  const existingAdmin = queryOne<{ id: number }>('SELECT id FROM users WHERE role = "admin" LIMIT 1');
  if (!existingAdmin) {
    const adminHash = bcrypt.hashSync('admin123', saltRounds);
    runSql(
      `INSERT INTO users (name, username, email, password_hash, role, active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
      ['System Administrator', 'admin', 'admin@brightcyber.co.ke', adminHash, 'admin', now, now]
    );
    console.log('[SEED] Initialized default admin account.');
  }

  // Only seed default cashier if no cashier accounts exist in database
  const existingCashier = queryOne<{ id: number }>('SELECT id FROM users WHERE role = "cashier" LIMIT 1');
  if (!existingCashier) {
    const cashierHash = bcrypt.hashSync('cashier123', saltRounds);
    runSql(
      `INSERT INTO users (name, username, email, password_hash, role, active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
      ['Jane Wanjiku (Cashier)', 'cashier', 'cashier@brightcyber.co.ke', cashierHash, 'cashier', now, now]
    );
    console.log('[SEED] Initialized default cashier account.');
  }

  // Ensure business settings with both M-Pesa channels
  const existingSettings = queryOne('SELECT id FROM business_settings WHERE id = 1');
  if (!existingSettings) {
    runSql(
      `INSERT OR REPLACE INTO business_settings (
        id, business_name, address, phone, email, receipt_footer, currency, tax_rate, tax_enabled, low_stock_threshold, receipt_prefix, allow_negative_stock, mpesa_paybill_or_till, services_mpesa_paybill, services_mpesa_account, products_mpesa_paybill, products_mpesa_account, updated_at
      ) VALUES (1, ?, ?, ?, ?, ?, ?, 0, 0, 5, 'BC-2026-', 0, ?, '4298298', '0350494', '247247', '768726', ?)`,
      [
        'BRIGHT CYBER & ICT CENTRE',
        'Biashara Street, Next to Central Plaza, Nairobi, Kenya',
        '+254 712 345 678 / +254 798 765 432',
        'info@brightcyber.co.ke',
        'Thank you for choosing Bright Cyber & ICT Centre. Fast, Quality Services & Stationery!',
        'KES',
        'Services: Paybill 4298298 (Acc: 0350494) | Products: Paybill 247247 (Acc: 768726)',
        now
      ]
    );
  }

  // 2. Service Categories
  const categories = [
    { name: 'PRINTING & DOCUMENTATION', type: 'service' },
    { name: 'GOVERNMENT SERVICES', type: 'service' },
    { name: 'GRAPHIC DESIGN & BRANDING', type: 'service' },
    { name: 'INTERNET & GENERAL OFFICE SERVICES', type: 'service' },
  ];

  const catIdMap: Record<string, number> = {};

  for (const cat of categories) {
    const existing = queryOne<{ id: number }>('SELECT id FROM categories WHERE name = ?', [cat.name]);
    if (existing) {
      catIdMap[cat.name] = existing.id;
    } else {
      const res = runSql(
        `INSERT INTO categories (name, type, active, created_at, updated_at) VALUES (?, ?, 1, ?, ?)`,
        [cat.name, cat.type, now, now]
      );
      catIdMap[cat.name] = res.lastInsertRowid;
    }
  }

  // 3. Services for Cyber & ICT Centre
  const services = [
    // PRINTING & DOCUMENTATION
    { cat: 'PRINTING & DOCUMENTATION', name: 'Black & White Printing (A4)', desc: 'Standard single or double-sided B&W print', price: 10, cost: 3, unit: 'page' },
    { cat: 'PRINTING & DOCUMENTATION', name: 'Colour Printing (A4)', desc: 'High-quality color printout on bond paper', price: 30, cost: 10, unit: 'page' },
    { cat: 'PRINTING & DOCUMENTATION', name: 'Photocopying B&W (A4)', desc: 'Fast single-page monochrome photocopy', price: 5, cost: 1.5, unit: 'copy' },
    { cat: 'PRINTING & DOCUMENTATION', name: 'Photocopying Colour (A4)', desc: 'Full color document duplication', price: 25, cost: 8, unit: 'copy' },
    { cat: 'PRINTING & DOCUMENTATION', name: 'Document Scanning & Emailing', desc: 'Direct multi-page scan to PDF or flash', price: 50, cost: 0, unit: 'document' },
    { cat: 'PRINTING & DOCUMENTATION', name: 'Document Typing & Formatting', desc: 'Fast typesetting and layout formatting', price: 50, cost: 0, unit: 'page' },
    { cat: 'PRINTING & DOCUMENTATION', name: 'Lamination (A4)', desc: 'Heavy duty protective film lamination', price: 100, cost: 30, unit: 'piece' },
    { cat: 'PRINTING & DOCUMENTATION', name: 'Spiral Binding (up to 100 pgs)', desc: 'Plastic spiral comb binding with covers', price: 150, cost: 45, unit: 'book' },
    { cat: 'PRINTING & DOCUMENTATION', name: 'Passport Photos (Set of 4)', desc: 'Studio camera shot with glossy photo print', price: 200, cost: 40, unit: 'set' },
    { cat: 'PRINTING & DOCUMENTATION', name: 'PDF Editing & Conversion', desc: 'File compression, merging, conversion', price: 100, cost: 0, unit: 'file' },

    // GOVERNMENT SERVICES
    { cat: 'GOVERNMENT SERVICES', name: 'eCitizen Services (Driving License / NTSA)', desc: 'Application, renewal, booking & printing', price: 300, cost: 0, unit: 'application' },
    { cat: 'GOVERNMENT SERVICES', name: 'eCitizen Good Conduct Application', desc: 'CID certificate booking, payment & forms', price: 300, cost: 0, unit: 'application' },
    { cat: 'GOVERNMENT SERVICES', name: 'eCitizen Business Registration', desc: 'Name search and business name filing', price: 500, cost: 0, unit: 'application' },
    { cat: 'GOVERNMENT SERVICES', name: 'KRA PIN Registration (Individual)', desc: 'New PIN generation and download', price: 200, cost: 0, unit: 'application' },
    { cat: 'GOVERNMENT SERVICES', name: 'KRA Nil Returns Filing', desc: 'Annual tax filing for students/unemployed', price: 150, cost: 0, unit: 'return' },
    { cat: 'GOVERNMENT SERVICES', name: 'KRA Employment Returns (P9)', desc: 'Annual income tax return with P9 sheet', price: 300, cost: 0, unit: 'return' },
    { cat: 'GOVERNMENT SERVICES', name: 'KUCCPS University/College Placement', desc: 'Course selection, revision & verification', price: 400, cost: 0, unit: 'session' },
    { cat: 'GOVERNMENT SERVICES', name: 'HELB Loan Application Assistance', desc: 'First time / subsequent loan application', price: 350, cost: 0, unit: 'application' },
    { cat: 'GOVERNMENT SERVICES', name: 'Passport Application on eCitizen', desc: 'Form filling, invoice generation, slot booking', price: 500, cost: 0, unit: 'application' },
    { cat: 'GOVERNMENT SERVICES', name: 'SHA (Social Health Authority) Registration', desc: 'Member registration, dependent add & verification', price: 200, cost: 0, unit: 'application' },
    { cat: 'GOVERNMENT SERVICES', name: 'TSC Online Portal Services', desc: 'Payslip download, promotion app, wealth declaration', price: 250, cost: 0, unit: 'service' },

    // GRAPHIC DESIGN & BRANDING
    { cat: 'GRAPHIC DESIGN & BRANDING', name: 'Logo Design (Standard Vector)', desc: 'Custom 2-concept logo with source files', price: 2500, cost: 0, unit: 'design' },
    { cat: 'GRAPHIC DESIGN & BRANDING', name: 'Poster / Flyer Design', desc: 'Single-sided high-resolution event / promo flyer', price: 1000, cost: 0, unit: 'design' },
    { cat: 'GRAPHIC DESIGN & BRANDING', name: 'Business Card Design & Print (Pack of 100)', desc: 'Double-sided matte/gloss card pack', price: 1500, cost: 600, unit: 'pack' },
    { cat: 'GRAPHIC DESIGN & BRANDING', name: 'Banner Design (per Sq Metre)', desc: 'Large format outdoor advertising banner', price: 1200, cost: 500, unit: 'sqm' },
    { cat: 'GRAPHIC DESIGN & BRANDING', name: 'T-Shirt / Jersey Heat Transfer Print', desc: 'Single color/full color heat-press vinyl or DTF', price: 600, cost: 250, unit: 'piece' },
    { cat: 'GRAPHIC DESIGN & BRANDING', name: 'Social Media Graphic / Ad Banner', desc: 'Optimized for Instagram, Facebook, WhatsApp', price: 800, cost: 0, unit: 'graphic' },
    { cat: 'GRAPHIC DESIGN & BRANDING', name: 'Company Profile Formatting (up to 8 pgs)', desc: 'Corporate branding layout with typography', price: 3500, cost: 0, unit: 'document' },

    // INTERNET & GENERAL OFFICE SERVICES
    { cat: 'INTERNET & GENERAL OFFICE SERVICES', name: 'Computer & High-Speed Internet Access (1 Hr)', desc: 'Browsing, research, downloads, office software', price: 60, cost: 10, unit: 'hour' },
    { cat: 'INTERNET & GENERAL OFFICE SERVICES', name: 'Computer & Internet Access (30 Mins)', desc: 'Quick check, emails, short tasks', price: 35, cost: 5, unit: 'session' },
    { cat: 'INTERNET & GENERAL OFFICE SERVICES', name: 'Professional CV / Resume Creation', desc: 'Modern ATS-friendly resume tailoring', price: 300, cost: 0, unit: 'resume' },
    { cat: 'INTERNET & GENERAL OFFICE SERVICES', name: 'Job Application & Document Uploading', desc: 'Form fill, PDF bundling, portal submission', price: 250, cost: 0, unit: 'application' },
    { cat: 'INTERNET & GENERAL OFFICE SERVICES', name: 'Computer Training (1 Month Basic Course)', desc: 'Windows, MS Word, Excel, Internet & Email', price: 4500, cost: 500, unit: 'course' },
    { cat: 'INTERNET & GENERAL OFFICE SERVICES', name: 'OS Installation & Computer Servicing', desc: 'Windows OS re-installation, drivers & basic software', price: 1500, cost: 100, unit: 'computer' },
    { cat: 'INTERNET & GENERAL OFFICE SERVICES', name: 'Antivirus Installation & Virus Removal', desc: 'Malware cleanup and licensed antivirus setup', price: 800, cost: 200, unit: 'service' },
  ];

  for (const s of services) {
    const existing = queryOne('SELECT id FROM services WHERE name = ?', [s.name]);
    if (!existing) {
      runSql(
        `INSERT INTO services (name, description, category_id, price, cost_estimate, unit, active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        [s.name, s.desc, catIdMap[s.cat], s.price, s.cost, s.unit, now, now]
      );
    }
  }

  // 4. Ensure physical products from the inventory table are present
  await ensurePhysicalProductsSeeded();

  // 5. Default Customers
  const customers = [
    { name: 'Walk-in Customer', phone: '', email: '', notes: 'Standard retail & cyber client' },
    { name: 'Dr. Kennedy Mwangi', phone: '+254 722 112 233', email: 'kmwangi@gmail.com', notes: 'Frequent medical research typing & color printouts' },
    { name: 'Mary Otieno', phone: '+254 733 445 566', email: 'mary.o@lawconsult.co.ke', notes: 'Legal documents, lamination & eCitizen filings' },
    { name: 'Apex Logistics Ltd', phone: '+254 710 998 877', email: 'accounts@apexlogistics.co.ke', notes: 'Monthly invoice printing & stationeries' },
  ];

  for (const c of customers) {
    const existing = queryOne('SELECT id FROM customers WHERE name = ?', [c.name]);
    if (!existing) {
      runSql(
        `INSERT INTO customers (name, phone, email, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [c.name, c.phone, c.email, c.notes, now, now]
      );
    }
  }

  // 6. Default Discounts & Promotional Offers
  const defaultDiscounts = [
    {
      code: 'STUDENT10',
      name: 'Student Special Discount',
      description: '10% off for verified university & college students',
      discount_type: 'percentage',
      value: 10,
      min_spend: 50,
      max_discount: 500,
      target_type: 'all',
      is_quick_preset: 1,
    },
    {
      code: 'BULK15',
      name: 'Bulk Stationery & Printing (15%)',
      description: '15% discount for bulk orders over KSh 1,000',
      discount_type: 'percentage',
      value: 15,
      min_spend: 1000,
      max_discount: 2000,
      target_type: 'all',
      is_quick_preset: 1,
    },
    {
      code: 'CYBER50',
      name: 'Cyber Session Promo (KSh 50 Off)',
      description: 'Flat KSh 50 instant waiver on orders over KSh 200',
      discount_type: 'fixed',
      value: 50,
      min_spend: 200,
      max_discount: null,
      target_type: 'service',
      is_quick_preset: 1,
    },
    {
      code: 'VIP5',
      name: 'Loyalty VIP Client (5%)',
      description: '5% gratitude discount for repeat frequent clients',
      discount_type: 'percentage',
      value: 5,
      min_spend: 0,
      max_discount: 1000,
      target_type: 'all',
      is_quick_preset: 1,
    },
    {
      code: 'PROMO20',
      name: 'Clearance & Flash Sale (20%)',
      description: '20% discount on promotional accessory & stationery sales',
      discount_type: 'percentage',
      value: 20,
      min_spend: 300,
      max_discount: 1500,
      target_type: 'product',
      is_quick_preset: 1,
    },
    {
      code: 'FLAT100',
      name: 'Manager Courtesy Discount (KSh 100 Off)',
      description: 'Flat KSh 100 concession for special customer requests',
      discount_type: 'fixed',
      value: 100,
      min_spend: 300,
      max_discount: null,
      target_type: 'all',
      is_quick_preset: 1,
    },
  ];

  for (const d of defaultDiscounts) {
    const existing = queryOne('SELECT id FROM discounts WHERE code = ? OR name = ?', [d.code, d.name]);
    if (!existing) {
      runSql(
        `INSERT INTO discounts (
          code, name, description, discount_type, value, min_spend, max_discount, target_type, is_quick_preset, usage_count, active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, ?, ?)`,
        [d.code, d.name, d.description, d.discount_type, d.value, d.min_spend, d.max_discount, d.target_type, d.is_quick_preset, now, now]
      );
    }
  }

  console.log('Database seeded and synchronized successfully.');
}
