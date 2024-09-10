const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;

const app = express();

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dawimtn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const appointmentOptionCollection = client
      .db("hasanDental")
      .collection("appointmentOptions");
    const bookingsCollection = client.db("hasanDental").collection("bookings");
    const usersCollection = client.db("hasanDental").collection("users");

    // Use Aggregate to query multiple collection nd thwn merge data
    app.get("/appointmentOptions", async (req, res) => {
      const date = req.query.date;
      //   console.log(date);
      const query = {};
      const options = await appointmentOptionCollection.find(query).toArray();

      //   et the booking of the provided date
      const bookingQuery = { appointmentDate: date };
      const alreadyBooked = await bookingsCollection
        .find(bookingQuery)
        .toArray();

      // code carefully
      options.forEach((option) => {
        const optionBooked = alreadyBooked.filter(
          (book) => book.treatment === option.name
        );
        const bookedSlots = optionBooked.map((book) => book.slot);
        const remainingSlots = option.slots.filter(
          (slot) => !bookedSlots.includes(slot)
        );
        option.slots = remainingSlots;
      });
      res.send(options);
    });

    app.get("/bookings", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const bookings = await bookingsCollection.find(query).toArray();
      res.send(bookings);
    });

    app.get("/appointmentSpecialty", async (req, res) => {
      const query = {};
      const result = await appointmentOptionCollection
        .find(query)
        .project({ name: 1 })
        .toArray();
      res.send(result);
    });

    app.post("/bookings", async (req, res) => {
      const booking = req.body;
      const query = {
        appointmentDate: booking.appointmentDate,
        email: booking.email,
        treatment: booking.treatment,
      };

      const alreadyBooked = await bookingsCollection.find(query).toArray();

      if (alreadyBooked.length) {
        const message = `You already have a booking on ${booking.appointmentDate}`;
        return res.send({ acknowledged: false, message });
      }
      const result = await bookingsCollection.insertOne(booking);
      res.send(result);
    });

    app.get("/users", async (req, res) => {
      const query = {};
      const users = await usersCollection.find(query).toArray();
      res.send(users);
    });

    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isAdmin: user?.role === "admin" });
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.put("/users/admin/:id", async (req, res) => {
      // console.log(req.params.email);
      // const decodedEmail = req.params.email;
      // const query = { email: decodedEmail };
      // const user = await usersCollection.findOne(query);

      // if (user?.role !== "admin") {
      //   return res.status(403).send({ message: "forbidden acces" });
      // }

      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });

    // stats
    app.get("/admin-stats", async (req, res) => {
      const users = await usersCollection.estimatedDocumentCount();
      const options =
        await appointmentOptionCollection.estimatedDocumentCount();
      const bookings = await bookingsCollection.estimatedDocumentCount();
      // console.log(users);

      // this is not the best way
      // const payment = await paymentCollection.find().toArray();
      // const revenue = payment.reduce(
      //   (total, payment) => total + payment.price,
      //   0
      // );

      // const result = await paymentCollection
      //   .aggregate([
      //     {
      //       $group: {
      //         _id: null,
      //         totalRevenue: {
      //           $sum: "$price",
      //         },
      //       },
      //     },
      //   ])
      //   .toArray();

      // const revenue = result.length > 0 ? result[0].totalRevenue : 0;

      res.send({
        users,
        options,
        bookings,
      });
    });
  } finally {
  }
}
run().catch(console.log());

app.get("/", async (req, res) => {
  res.send("hasan detal server is running");
});

app.listen(port, () => console.log(`server is ruuning on ${port}`));
