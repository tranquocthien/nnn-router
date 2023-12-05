export default async (req, res) => {
  throw new Error('Sample error while getting book ' + req.params.bookId)
}
