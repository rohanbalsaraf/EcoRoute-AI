use crate::algorithm::{Edge, Vehical, green_dijkstra};

mod algorithm;
fn main(){
    let graph = vec![
        vec![
            Edge { to: 1, weight: 10.0, vehical: Vehical::GasVehicle, distance: () },
            Edge { to: 2, weight: 20.0, vehical: Vehical::GasVehicle, distance: () },
            Edge { to: 3, weight: 15.0, vehical: Vehical::GasVehicle, distance: () }
        ],
        vec![
            Edge {to:2, weight:15.0, vehical: Vehical::GasVehicle, distance: ()},
        ],
        vec![],
        vec![],
    ];

    let start = 0;
    let end = 2;
    let vehical = Vehical::GasVehicle;

    if let Some((cost, path)) = green_dijkstra(&graph, start, end, &vehical) {
        println!("Optimal Green Route for {:?} vehicle is: {:?}", vehical, path);
        println!("Total Carbon Cost: {:?}", cost);
    } else {
        println!("No path found");
    }
}