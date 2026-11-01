class APIfeatures {
  // so this constructor is accepting two things whcich are these 1-> the mongoose query and the second being the queryString that we get from the express
  // so you can understand the queryStr as the query that we gets from the http req in req.query and mongoose query as the one tour.find() and all sends
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    const queryObj = { ...this.queryString };
    const excludeFeilds = ['page', 'sort', 'limit', 'fields', 'search'];
    excludeFeilds.forEach((el) => delete queryObj[el]);

    // 2) advance filtering so So what we are doing here is that We have inquiry where we are asking the duration
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    this.query = this.query.find(JSON.parse(queryStr));
    // let query = Tour.find(JSON.parse(queryStr));

    return this; // over here this means the entire object and which ofcourse has the access the to the these other methods
  }

  // ?search=sea  -> every name that contains "sea" (upper or lower case).
  // The text is escaped first, so a visitor cannot send a regular expression of his own
  search() {
    const text = String(this.queryString.search || '')
      .trim()
      .slice(0, 50);

    if (text) {
      const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      this.query = this.query.find({
        name: { $regex: escaped, $options: 'i' },
      });
    }

    return this;
  }

  sort() {
    // _id at the end: if many tours have the same price (or duration) the order must still be the same on every request,
    // otherwise a tour can show up on two pages, or on none of them, while paging
    const sortBy = this.queryString.sort
      ? this.queryString.sort.split(',').join(' ')
      : '-createdAt';

    this.query = this.query.sort(`${sortBy} _id`);

    return this;
  }

  limitFeilds() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
    }

    return this;
  }

  paginate() {
    const page = this.queryString.page * 1 || 1;

    // nobody can ask for more than 100 documents at once
    const limit = Math.min(this.queryString.limit * 1 || 100, 100);

    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}

module.exports = APIfeatures;
