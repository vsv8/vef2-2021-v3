import express from 'express';
import { pageSelection, deleteSignatureById } from './db.js';
import { catchErrors } from './utils.js';

export const router = express.Router();

function ensureLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.redirect('/login');
}

async function index(req, res) {
  let { page = 1 } = req.query;
  page = Number(page);

  const errors = [];
  const formData = {
    name: '',
    nationalId: '',
    anonymous: false,
    comment: '',
  };

  const signaturePage = await pageSelection(page);
  res.render('admin', {
    errors, formData, signaturePage,
  });
}

async function deleteSignature(req, res) {
  let { id } = req.body;
  id = Number(id);
  await deleteSignatureById(id);
  res.redirect('admin');
}

router.get('/admin', ensureLoggedIn, catchErrors(index));
router.post('/delete', ensureLoggedIn, catchErrors(deleteSignature));
